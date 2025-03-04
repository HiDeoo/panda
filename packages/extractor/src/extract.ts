import { Arr, Bool, Opt, cast, noop, pipe } from 'lil-fp'
import { JsxOpeningElement, JsxSelfClosingElement, Node } from 'ts-morph'
import { match } from 'ts-pattern'
import { box } from './box'
import { BoxNodeMap, BoxNodeObject, type BoxNode, type MapTypeValue, BoxNodeConditional } from './box-factory'
import { extractCallExpressionArguments } from './call-expression'
import { extractJsxAttribute } from './jsx-attribute'
import { extractJsxSpreadAttributeValues } from './jsx-spread-attribute'
import { objectLikeToMap } from './object-like-to-map'
import type {
  ExtractOptions,
  ExtractResultByName,
  ExtractedComponentInstance,
  ExtractedComponentResult,
  ExtractedFunctionInstance,
  ExtractedFunctionResult,
  ExtractedTaggedTemplateInstance,
  MatchFnPropArgs,
  MatchPropArgs,
} from './types'
import { getComponentName } from './utils'
import { maybeBoxNode } from './maybe-box-node'

type JsxElement = JsxOpeningElement | JsxSelfClosingElement
type Component = { name: string; props: MapTypeValue; conditionals: BoxNodeConditional[] }
type ComponentMap = Map<JsxElement, Component>

const isImportOrExport = Bool.or(Node.isImportDeclaration, Node.isExportDeclaration)

export const extract = ({ ast, ...ctx }: ExtractOptions) => {
  const { components, functions, taggedTemplates } = ctx

  /** contains all the extracted nodes from this ast parsing */
  const byName: ExtractResultByName = new Map()
  /**
   * associate a component node with its props and (spread) conditionals
   * since js es6 map preserve insertion order, we can use it to keep the order of the props
   * so we can keep the last one
   * ex: <ColorBox padding="4" {...{ color: "blue.100" }} color="red" margin={2} />
   * => color: "red"
   */
  const componentByNode: ComponentMap = new Map()

  // keep track of the current component node
  // so we don't have to traverse the tree upwards again
  let componentNode: JsxElement | undefined
  let componentName: string
  let isFactory: boolean
  let boxByProp: ExtractedComponentResult['nodesByProp']
  let component: Component

  ast.forEachDescendant((node, traversal) => {
    // quick win
    if (isImportOrExport(node)) {
      traversal.skip()
      return
    }

    if (components) {
      if (Node.isJsxOpeningElement(node) || Node.isJsxSelfClosingElement(node)) {
        componentNode = node
        componentName = getComponentName(componentNode)
        isFactory = componentName.includes('.')

        if (!components.matchTag({ tagNode: componentNode, tagName: componentName, isFactory })) {
          componentNode = undefined
          return
        }

        if (!byName.has(componentName)) {
          byName.set(componentName, { kind: 'component', nodesByProp: new Map(), queryList: [] })
        }

        boxByProp = byName.get(componentName)!.nodesByProp

        if (!componentByNode.has(componentNode)) {
          componentByNode.set(componentNode, { name: componentName, props: new Map(), conditionals: [] })
        }

        component = componentByNode.get(componentNode)!
      }

      if (Node.isJsxSpreadAttribute(node)) {
        // <ColorBox {...{ color: "facebook.100" }}>spread</ColorBox>
        //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        if (!componentNode || !component) return

        const matchProp = ({ propName, propNode }: MatchPropArgs) =>
          components.matchProp({ tagNode: componentNode!, tagName: componentName, propName, propNode })

        const spreadNode = extractJsxSpreadAttributeValues(node, ctx, cast(matchProp))
        if (!spreadNode) return

        // <ColorBox padding="4" {...{ color: "facebook.100" }} margin={2} />
        // the parent ref contains the props that were already extracted from the jsx attributes (not spread)
        // so we can merge the spread props with those extracted props

        const processObjectLike = (objLike: BoxNodeMap | BoxNodeObject) => {
          const mapValue = objectLikeToMap(objLike, node)
          const isMap = box.isMap(objLike)
          const boxNode = box.map(mapValue, node, [componentNode!])

          if (isMap && objLike.spreadConditions?.length) {
            boxNode.spreadConditions = objLike.spreadConditions
          }

          mapValue.forEach((propValue, propName) => {
            if (matchProp({ propName, propNode: node as any })) {
              component.props.set(propName, propValue)
              boxByProp.set(propName, (boxByProp.get(propName) ?? []).concat(propValue))
            }
          })
        }

        const processBoxNode = (boxNode: BoxNode) => {
          return (
            match(boxNode)
              // <ColorBox {...(someCondition && { color: "facebook.100" })} />
              .when(box.isConditional, (boxNode) => {
                component.conditionals.push(boxNode)
              })
              .when(Bool.or(box.isObject, box.isMap), (boxNode) => {
                return processObjectLike(boxNode)
              })
              .otherwise(noop)
          )
        }

        processBoxNode(spreadNode)

        return
      }

      if (Node.isJsxAttribute(node)) {
        // <ColorBox color="red.200" backgroundColor="blackAlpha.100" />
        //           ^^^^^           ^^^^^^^^^^^^^^^

        if (!componentNode || !component) return

        const propName = node.getNameNode().getText()
        if (!components.matchProp({ tagNode: componentNode, tagName: componentName, propName, propNode: node })) {
          return
        }

        pipe(
          extractJsxAttribute(node, ctx),
          Opt.fromNullable,
          Opt.tap((maybeBox) => {
            component.props.set(propName, maybeBox)
            boxByProp.set(propName, (boxByProp.get(propName) ?? []).concat(maybeBox))
          }),
        )
      }
    }

    if (functions && Node.isCallExpression(node)) {
      const fnName = node.getExpression().getText()
      if (!functions.matchFn({ fnNode: node, fnName })) return

      const matchProp = ({ propName, propNode }: MatchFnPropArgs) =>
        functions.matchProp({ fnNode: node, fnName, propName, propNode })

      if (!byName.has(fnName)) {
        byName.set(fnName, { kind: 'function', nodesByProp: new Map(), queryList: [] })
      }

      const fnResultMap = byName.get(fnName)! as ExtractedFunctionResult
      const boxByProp = fnResultMap.nodesByProp

      const boxNodeArray = extractCallExpressionArguments(node, ctx, matchProp, functions.matchArg)

      const nodeList = pipe(
        boxNodeArray.value,
        Arr.map((boxNode) =>
          match(boxNode)
            .when(Bool.or(box.isObject, box.isMap), (boxNode) => {
              const mapValue = objectLikeToMap(boxNode, node)
              const isMap = box.isMap(boxNode)

              mapValue.forEach((propValue, propName) => {
                // if the boxNode is an object
                // that means it was evaluated so we need to filter its props
                // otherwise, it was already filtered in extractCallExpressionArguments
                if (isMap ? true : matchProp({ propName, propNode: node as any })) {
                  boxByProp.set(propName, (boxByProp.get(propName) ?? []).concat(propValue))
                }
              })

              const boxMap = box.map(mapValue, node, boxNode.getStack())
              if (box.isMap(boxNode) && boxNode.spreadConditions?.length) {
                boxMap.spreadConditions = boxNode.spreadConditions
              }

              return boxMap
            })
            .otherwise((boxNode) => boxNode),
        ),
      )

      const query = {
        kind: 'call-expression',
        name: fnName,
        box: box.array(nodeList, node, []),
      } as ExtractedFunctionInstance
      fnResultMap.queryList.push(query)
    }

    if (taggedTemplates && Node.isTaggedTemplateExpression(node)) {
      const tag = node.getTag()
      // styled('span')`...` or styled.span`...`
      const fnName = Node.isCallExpression(tag) ? tag.getExpression().getText() : tag.getText()
      if (!taggedTemplates.matchTaggedTemplate({ taggedTemplateNode: node, fnName })) return

      if (!byName.has(fnName)) {
        byName.set(fnName, { kind: 'function', nodesByProp: new Map(), queryList: [] })
      }

      const fnResultMap = byName.get(fnName)! as ExtractedFunctionResult
      const query = {
        kind: 'tagged-template',
        name: fnName,
        box: maybeBoxNode(node, [], ctx),
      } as ExtractedTaggedTemplateInstance
      fnResultMap.queryList.push(query)
    }
  })

  // after traversing the whole tree
  // since we targeted the component nodes (JsxAttribute/JsxSpreadAttribute) we didnt know when we were done with a component
  // we can now reconstruct each component instance (a `query` is made of a component instance BoxNodeMap + its name)
  componentByNode.forEach((parentRef, componentNode) => {
    const component = componentByNode.get(componentNode)
    if (!component) return

    const query = cast<ExtractedComponentInstance>({
      name: parentRef.name,
      box: box.map(component.props, componentNode, []),
    })

    if (component.conditionals?.length) {
      query.box.spreadConditions = component.conditionals
    }

    const componentName = parentRef.name
    const queryList = (byName.get(componentName)! as ExtractedComponentResult).queryList
    queryList.push(query)
  })

  return byName
}
