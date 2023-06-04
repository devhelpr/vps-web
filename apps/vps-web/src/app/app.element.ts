import './app.element.css';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import styles from '../styles.css?inline';
import {
  createElement,
  IElementNode,
  INodeComponent,
  INodeComponentRelation,
  NodeComponentRelationType,
  createEffect,
  getSelectedNode,
  setSelectNode,
  getVisbility,
  setVisibility,
  setupMarkupElement,
  createElementMap,
  createCanvasApp,
  CanvasAppInstance,
  ThumbType,
  ThumbConnectionType,
  getPointOnCubicBezierCurve,
  ControlAndEndPointNodeType,
  CurveType,
  createNamedSignal,
} from '@devhelpr/visual-programming-system';

import { registerCustomFunction } from '@devhelpr/expression-compiler';
import flowData from '../example-data/tiltest.json';

import { FormComponent } from './components/form-component';

import { run } from './simple-flow-engine/simple-flow-engine';
import { NodeInfo } from './types/node-info';
import { getExpression } from './nodes/expression';
import { getIfCondition } from './nodes/if-condition';
import { getShowInput } from './nodes/show-input';
import { getSum } from './nodes/sum';

const template = document.createElement('template');
template.innerHTML = `
  <style>${styles}</style>
  <div class="h-screen w-full bg-slate-800 overflow-hidden" id="root" >
  </div>
`;

const button =
  'rounded-md bg-slate-500 text-white p-2 m-2 hover:bg-slate-600 select-none whitespace-nowrap';
const menubar = 'fixed top-0 z-20 flex flex-row items-center justify-start';

export class AppElement extends HTMLElement {
  public static observedAttributes = [];

  onclick = (_ev: MouseEvent) => {
    alert('clicked');
  };

  disconnectedCallback() {
    const button = document.querySelector('button');
    if (button) {
      button.removeEventListener('click', this.onclick);
    }
  }

  canvas?: IElementNode<NodeInfo> = undefined;
  canvasApp?: CanvasAppInstance = undefined;

  clearElement = (element: IElementNode<NodeInfo>) => {
    element.domElement.remove();
    const node = element as unknown as INodeComponent<NodeInfo>;
    if (node && node.delete) {
      node.delete();
    }
    element.elements.forEach((element: IElementNode<NodeInfo>) => {
      this.clearElement(element as unknown as IElementNode<NodeInfo>);
    });
    element.elements = createElementMap<NodeInfo>();
  };

  clearCanvas = () => {
    this.canvasApp?.elements.forEach((element) => {
      element.domElement.remove();
      this.clearElement(element as unknown as IElementNode<NodeInfo>);
    });
    this.canvasApp?.elements.clear();
    this.canvasApp?.setCamera(0, 0, 1);
  };

  getThumbNode = (thumbType: ThumbType, node: INodeComponent<NodeInfo>) => {
    if (node.thumbConnectors) {
      const thumbNode = node.thumbConnectors.find((thumbNode) => {
        return thumbNode.thumbType === thumbType;
      });
      return thumbNode;
    }
  };

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));
    const rootElement = shadowRoot.querySelector('div#root') as HTMLElement;
    if (!rootElement) {
      return;
    }
    const bezierCurve: any = undefined;

    const canvasApp = createCanvasApp<NodeInfo>(rootElement);
    this.canvas = canvasApp.canvas;
    this.canvasApp = canvasApp;
    canvasApp.setOnCanvasClick((x, y) => {
      setSelectNode(undefined);

      // canvasApp.createRect(
      //   x,
      //   y,
      //   200,
      //   100,
      //   undefined,
      //   undefined,
      //   [
      //     {
      //       thumbType: ThumbType.StartConnectorCenter,
      //       thumbIndex: 0,
      //       connectionType: ThumbConnectionType.start,
      //     },
      //     {
      //       thumbType: ThumbType.EndConnectorCenter,
      //       thumbIndex: 0,
      //       connectionType: ThumbConnectionType.end,
      //     },
      //   ],
      //   `<p>Node</p><p>Created on click</p><p>dummy node</p><div class="h-24"></div>`,
      //   {
      //     classNames: `bg-slate-500 p-4 rounded`,
      //   }
      // );
    });

    const menubarElement = createElement(
      'div',
      {
        class: menubar,
      },
      rootElement
    );
    // createElement(
    //   'button',
    //   {
    //     class: button,
    //     click: (event) => {
    //       event.preventDefault();
    //       if (this.canvas) {
    //         createNodeElement(
    //           'div',
    //           this.canvas.domElement,
    //           canvasApp.elements
    //         );
    //       }
    //       return false;
    //     },
    //   },
    //   menubarElement.domElement,
    //   'Add element'
    // );

    createElement(
      'button',
      {
        class: button,
        click: (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.clearCanvas();
          return false;
        },
      },
      menubarElement.domElement,
      'Clear canvas'
    );

    createElement(
      'button',
      {
        class: button,
        click: (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.canvasApp?.elements.forEach((node) => {
            const nodeComponent = node as unknown as INodeComponent<NodeInfo>;
            if (nodeComponent.nodeType !== 'connection') {
              if (nodeComponent.nodeInfo.initializeCompute) {
                nodeComponent.nodeInfo.initializeCompute();
              }
            }
          });
          return false;
        },
      },
      menubarElement.domElement,
      'Reinitialze nodes'
    );

    // createElement(
    //   'button',
    //   {
    //     class: button,
    //     click: (event) => {
    //       event.preventDefault();
    //       this.clearCanvas();
    //       flowData.forEach((flowNode) => {
    //         if (flowNode.shapeType !== 'Line') {
    //           const rect = canvasApp?.createRect(
    //             flowNode.x ?? 0,
    //             flowNode.y ?? 0,
    //             200,
    //             300,
    //             flowNode.taskType,
    //             undefined,
    //             [
    //               {
    //                 thumbType: ThumbType.StartConnectorCenter,
    //                 thumbIndex: 0,
    //                 connectionType: ThumbConnectionType.start,
    //               },
    //               {
    //                 thumbType: ThumbType.EndConnectorCenter,
    //                 thumbIndex: 0,
    //                 connectionType: ThumbConnectionType.end,
    //               },
    //             ],
    //             `<p>${flowNode.taskType}</p>`,
    //             {
    //               classNames: `bg-slate-500 p-4 rounded`,
    //             }
    //           );
    //           rect.nodeComponent.nodeInfo = flowNode;
    //         }
    //       });

    //       const elementList = Array.from(canvasApp?.elements ?? []);
    //       console.log('elementList', elementList);

    //       flowData.forEach((flowNode) => {
    //         if (flowNode.shapeType === 'Line') {
    //           let start: INodeComponent<NodeInfo> | undefined = undefined;
    //           let end: INodeComponent<NodeInfo> | undefined = undefined;
    //           if (flowNode.startshapeid) {
    //             const startElement = elementList.find((e) => {
    //               const element = e[1] as IElementNode<NodeInfo>;
    //               return element.nodeInfo?.id === flowNode.startshapeid;
    //             });
    //             if (startElement) {
    //               start =
    //                 startElement[1] as unknown as INodeComponent<NodeInfo>;
    //             }
    //           }
    //           if (flowNode.endshapeid) {
    //             const endElement = elementList.find((e) => {
    //               const element = e[1] as IElementNode<NodeInfo>;
    //               return element.nodeInfo?.id === flowNode.endshapeid;
    //             });
    //             if (endElement) {
    //               end = endElement[1] as unknown as INodeComponent<NodeInfo>;
    //             }
    //           }

    //           const curve = canvasApp.createCubicBezier(
    //             start?.x ?? 0,
    //             start?.y ?? 0,
    //             end?.x ?? 0,
    //             end?.y ?? 0,
    //             (start?.x ?? 0) + 100,
    //             (start?.y ?? 0) + 150,
    //             (end?.x ?? 0) + 100,
    //             (end?.y ?? 0) + 150,
    //             false
    //           );

    //           curve.nodeComponent.isControlled = true;
    //           curve.nodeComponent.nodeInfo = flowNode;

    //           if (start && curve.nodeComponent) {
    //             curve.nodeComponent.components.push({
    //               type: NodeComponentRelationType.start,
    //               component: start,
    //             } as unknown as INodeComponentRelation<NodeInfo>);

    //             curve.nodeComponent.startNode = start;
    //             curve.nodeComponent.startNodeThumb = this.getThumbNode(
    //               ThumbType.StartConnectorCenter,
    //               start
    //             );
    //           }

    //           if (end && curve.nodeComponent) {
    //             curve.nodeComponent.components.push({
    //               type: NodeComponentRelationType.end,
    //               component: end,
    //             } as unknown as INodeComponentRelation<NodeInfo>);

    //             curve.nodeComponent.endNode = end;
    //             curve.nodeComponent.endNodeThumb = this.getThumbNode(
    //               ThumbType.EndConnectorCenter,
    //               end
    //             );
    //           }
    //           if (curve.nodeComponent.update) {
    //             curve.nodeComponent.update();
    //           }
    //         }
    //       });
    //       this.canvasApp?.centerCamera();
    //       return false;
    //     },
    //   },
    //   menubarElement.domElement,
    //   'import flow'
    // );

    // createElement(
    //   'button',
    //   {
    //     class: button,
    //     click: (event) => {
    //       event.preventDefault();
    //       console.log('click RECT', (event.target as HTMLElement)?.tagName);
    //       const startX = Math.floor(Math.random() * 250);
    //       const startY = Math.floor(Math.random() * 500);

    //       const testButton = createElement(
    //         'button',
    //         {
    //           class: `${button} w-[300px] h-[300px] overflow-hidden m-0`,
    //           click: (event) => {
    //             event.preventDefault();
    //             event.stopPropagation();
    //             alert('test');
    //             return false;
    //           },
    //         },
    //         undefined,
    //         'Click here'
    //       );

    //       const testIfCondition = createElement(
    //         'div',
    //         {
    //           class:
    //             'flex text-center items-center justify-center w-[100px] h-[120px] overflow-hidden bg-slate-500 rounded cursor-pointer',
    //           style: {
    //             'clip-path': 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%',
    //           },
    //         },
    //         undefined,
    //         'If condition'
    //       );

    //       const formElements = [
    //         {
    //           fieldType: FormFieldType.Text,
    //           fieldName: 'Expression',
    //           value: '',
    //           onChange: (value: string) => {
    //             node.nodeComponent.nodeInfo.formValues = {
    //               ...node.nodeComponent.nodeInfo.formValues,
    //               Expression: value,
    //             };
    //             console.log('onChange', node.nodeComponent.nodeInfo);
    //           },
    //         },
    //       ];

    //       const jsxComponentWrapper = createElement(
    //         'div',
    //         {
    //           class: `bg-slate-500 p-4 rounded cursor-pointer`,
    //         },
    //         undefined,
    //         FormComponent({
    //           id: 'test',
    //           formElements,
    //           hasSubmitButton: false,
    //           onSave: (formValues) => {
    //             //
    //           },
    //         }) as unknown as HTMLElement
    //       ) as unknown as INodeComponent<NodeInfo>;

    //       const node = canvasApp.createRect(
    //         startX,
    //         startY,
    //         200,
    //         100,
    //         undefined,
    //         undefined,
    //         [
    //           {
    //             thumbType: ThumbType.StartConnectorCenter,
    //             thumbIndex: 0,
    //             connectionType: ThumbConnectionType.start,
    //           },
    //           {
    //             thumbType: ThumbType.EndConnectorCenter,
    //             thumbIndex: 0,
    //             connectionType: ThumbConnectionType.end,
    //           },
    //           // {
    //           //   thumbType: ThumbType.StartConnectorRight,
    //           //   thumbIndex: 0,
    //           //   connectionType: ThumbConnectionType.start,
    //           // },
    //           // {
    //           //   thumbType: ThumbType.StartConnectorRight,
    //           //   thumbIndex: 1,
    //           //   connectionType: ThumbConnectionType.start,
    //           // },
    //           // {
    //           //   thumbType: ThumbType.StartConnectorTop,
    //           //   thumbIndex: 0,
    //           //   connectionType: ThumbConnectionType.start,
    //           // },
    //           // {
    //           //   thumbType: ThumbType.EndConnectorTop,
    //           //   thumbIndex: 0,
    //           //   connectionType: ThumbConnectionType.end,
    //           // },
    //         ],
    //         //testIfCondition as unknown as INodeComponent<NodeInfo>,
    //         jsxComponentWrapper,
    //         //testButton as unknown as INodeComponent<NodeInfo>,
    //         //`<p>Node</p><p>Lorem ipsum</p><p>dummy node</p><div class="h-24"></div>`,
    //         {
    //           classNames: `bg-slate-500 p-4 rounded`,
    //         }
    //       );
    //       node.nodeComponent.nodeInfo = {};
    //       node.nodeComponent.nodeInfo.formElements = formElements;

    //       createNamedSignal('test', '');
    //       return false;
    //     },
    //   },
    //   menubarElement.domElement,
    //   'Add rect'
    // );

    createElement(
      'button',
      {
        class: button,
        click: (event) => {
          event.preventDefault();
          const startX = Math.floor(Math.random() * 250);
          const startY = Math.floor(Math.random() * 500);
          const expression = getExpression();
          expression.createVisualNode(canvasApp, startX, startY);
          return false;
        },
      },
      menubarElement.domElement,
      'Add "expression"'
    );

    createElement(
      'button',
      {
        class: button,
        click: (event) => {
          event.preventDefault();
          const startX = Math.floor(Math.random() * 250);
          const startY = Math.floor(Math.random() * 500);
          const ifCondition = getIfCondition();
          ifCondition.createVisualNode(canvasApp, startX, startY);

          return false;
        },
      },
      menubarElement.domElement,
      'Add "if-condition"'
    );

    createElement(
      'button',
      {
        class: button,
        click: (event) => {
          event.preventDefault();
          const startX = Math.floor(Math.random() * 250);
          const startY = Math.floor(Math.random() * 500);
          const showInput = getShowInput();
          showInput.createVisualNode(canvasApp, startX, startY);

          return false;
        },
      },
      menubarElement.domElement,
      'Add "show input"'
    );

    createElement(
      'button',
      {
        class: button,
        click: (event) => {
          event.preventDefault();
          const startX = Math.floor(Math.random() * 250);
          const startY = Math.floor(Math.random() * 500);
          const sum = getSum();
          sum.createVisualNode(canvasApp, startX, startY);

          return false;
        },
      },
      menubarElement.domElement,
      'Add "sum"'
    );

    // createElement(
    //   'button',
    //   {
    //     class: button,
    //     click: (event) => {
    //       event.preventDefault();

    //       const x = Math.floor(Math.random() * 250);
    //       const y = Math.floor(Math.random() * 500);

    //       // if (Math.random() >= 0.5) {
    //       bezierCurve = canvasApp.createCubicBezier(
    //         x,
    //         y,
    //         x + 150,
    //         y + 150,
    //         x + 50,
    //         y + 50,
    //         x + 75,
    //         y + 75
    //       );
    //       // } else {
    //       // bezierCurve = createQuadraticBezier(
    //       //   canvas as unknown as INodeComponent<NodeInfo>,
    //       //   pathHiddenElement,
    //       //   this.elements,
    //       //   x,
    //       //   y,
    //       //   x + 150,
    //       //   y + 150,
    //       //   x + 50,
    //       //   y + 50
    //       // );
    //       // }
    //       return false;
    //     },
    //   },
    //   menubarElement.domElement,
    //   'Add bezier curve'
    // );

    // createElement(
    //   'button',
    //   {
    //     class: button,
    //     click: (event) => {
    //       event.preventDefault();

    //       createMarkupElement(
    //         '<div><h2>TITLE</h2><p>subtitle</p></div>',
    //         canvasApp.canvas.domElement,
    //         canvasApp.elements
    //       );
    //       return false;
    //     },
    //   },
    //   menubarElement.domElement,
    //   'Add markup element'
    // );

    createElement(
      'button',
      {
        class: button,
        click: (event) => {
          event.preventDefault();
          this.canvasApp?.centerCamera();
          return false;
        },
      },
      menubarElement.domElement,
      'center'
    );

    // createElement(
    //   'button',
    //   {
    //     class: button,
    //     click: (event) => {
    //       event.preventDefault();
    //       setVisibility(!getVisbility());
    //       return false;
    //     },
    //   },
    //   menubarElement.domElement,
    //   'switch visibility'
    // );

    // createElement(
    //   'button',
    //   {
    //     class: button,
    //     click: (event) => {
    //       event.preventDefault();
    //       this.clearCanvas();

    //       const maxRows = 20;
    //       const maxColumns = 20;

    //       const dateTimestampAll = performance.now();

    //       const spacing = 500;
    //       let loopRows = 0;
    //       while (loopRows < maxRows) {
    //         let loopColumns = 0;
    //         while (loopColumns < maxColumns) {
    //           const dateTimestamp = performance.now();

    //           const clipPaths = [
    //             'polygon(50% 2.4%, 34.5% 33.8%, 0% 38.8%, 25% 63.1%, 19.1% 97.6%, 50% 81.3%, 80.9% 97.6%, 75% 63.1%, 100% 38.8%, 65.5% 33.8%)',
    //             'polygon(50% 0, 100% 50%, 50% 100%, 0 50%',
    //             'circle(50%)',
    //             'polygon(50% 0, 100% 100%, 0 100%)',
    //             'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    //             'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)',
    //             'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)',
    //           ];
    //           const color = `rgb(${
    //             128 + Math.floor(Math.random() * 128)
    //           },${Math.floor(Math.random() * 16)},${Math.floor(
    //             Math.random() * 16
    //           )})`;

    //           const testNode = createElement(
    //             'button',
    //             {
    //               class:
    //                 'flex text-centerv text-white text-xl items-center justify-center w-[100px] h-[120px] overflow-hidden bg-red-500 rounded cursor-pointer',
    //               style: {
    //                 'background-color': color,
    //                 'clip-path':
    //                   clipPaths[
    //                     Math.round(Math.random() * (clipPaths.length - 1))
    //                   ],
    //               },
    //               click: (event) => {
    //                 event.preventDefault();
    //                 //alert(`click ${testNode.id}`);
    //                 animatePath(rect.nodeComponent.id, color);
    //                 return false;
    //               },
    //             },
    //             undefined,
    //             `${loopRows * maxColumns + loopColumns}`
    //           );

    //           const rect = canvasApp?.createRect(
    //             loopColumns * spacing + Math.floor(-75 + Math.random() * 150),
    //             loopRows * spacing + Math.floor(-75 + Math.random() * 150),
    //             100,
    //             100,
    //             'node',
    //             undefined,
    //             [
    //               {
    //                 thumbType: ThumbType.StartConnectorCenter,
    //                 thumbIndex: 0,
    //                 connectionType: ThumbConnectionType.start,
    //               },
    //               {
    //                 thumbType: ThumbType.EndConnectorCenter,
    //                 thumbIndex: 0,
    //                 connectionType: ThumbConnectionType.end,
    //               },
    //             ],
    //             testNode as unknown as INodeComponent<NodeInfo>,
    //             // `<div class="text-center">${
    //             //   loopRows * maxColumns + loopColumns
    //             // }</div>`
    //             {
    //               classNames: `bg-slate-500 p-4 rounded`,
    //               //classNames: `bg-slate-500 rounded flex justify-center items-center text-center w-[80px] h-[100px] `,
    //             }
    //           );
    //           rect.nodeComponent.nodeInfo = {
    //             column: loopColumns,
    //             row: loopRows,
    //           };

    //           //console.log('createRect', performance.now() - dateTimestamp);
    //           loopColumns++;
    //         }
    //         loopRows++;
    //       }

    //       const elementList = Array.from(canvasApp?.elements ?? []);
    //       loopRows = 0;
    //       while (loopRows < maxRows - 1) {
    //         let loopColumns = 0;
    //         while (loopColumns < maxColumns - 1) {
    //           const start = elementList[
    //             loopRows * maxColumns + loopColumns
    //           ][1] as unknown as INodeComponent<NodeInfo>;
    //           const end = elementList[
    //             (loopRows + 1) * maxColumns + loopColumns + 1
    //           ][1] as unknown as INodeComponent<NodeInfo>;
    //           console.log(loopRows, loopColumns, 'start', start, 'end', end);

    //           const curve = canvasApp.createCubicBezier(
    //             loopColumns * spacing,
    //             loopRows * spacing,
    //             (loopColumns + 1) * spacing,
    //             loopRows * spacing,
    //             loopColumns * spacing + 100,
    //             loopRows * spacing + spacing / 2,
    //             (loopColumns + 1) * spacing + 100,
    //             loopRows * spacing + spacing / 2,
    //             false
    //           );

    //           curve.nodeComponent.isControlled = true;
    //           curve.nodeComponent.nodeInfo = {
    //             column: loopColumns,
    //             row: loopRows,
    //           };

    //           if (start && curve.nodeComponent) {
    //             curve.nodeComponent.components.push({
    //               type: NodeComponentRelationType.start,
    //               component: start,
    //             } as unknown as INodeComponentRelation<NodeInfo>);

    //             curve.nodeComponent.startNode = start;
    //             curve.nodeComponent.startNodeThumb = this.getThumbNode(
    //               ThumbType.StartConnectorCenter,
    //               start
    //             );
    //           }

    //           if (end && curve.nodeComponent) {
    //             curve.nodeComponent.components.push({
    //               type: NodeComponentRelationType.end,
    //               component: end,
    //             } as unknown as INodeComponentRelation<NodeInfo>);

    //             curve.nodeComponent.endNode = end;
    //             curve.nodeComponent.endNodeThumb = this.getThumbNode(
    //               ThumbType.EndConnectorCenter,
    //               end
    //             );
    //           }
    //           if (curve.nodeComponent.update) {
    //             curve.nodeComponent.update();
    //           }
    //           console.log('createCubicBezier', curve);

    //           loopColumns++;
    //         }
    //         loopRows++;
    //       }

    //       console.log('createRect All', performance.now() - dateTimestampAll);

    //       const dateTimestamp = performance.now();

    //       this.canvasApp?.centerCamera();

    //       console.log('centerCamera', performance.now() - dateTimestamp);

    //       return false;
    //     },
    //   },
    //   menubarElement.domElement,
    //   'stress test'
    // );

    const getNodeConnectionPairById = (
      nodeId: string,
      followPathByName?: string
    ) => {
      const connectionPairs: {
        start: INodeComponent<NodeInfo>;
        end: INodeComponent<NodeInfo>;
        connection: INodeComponent<NodeInfo>;
      }[] = [];

      // EXPENSIVE copy
      const elementList = Array.from(canvasApp?.elements ?? []);
      const node = this.canvasApp?.elements?.get(nodeId);
      if (node) {
        const start = node as unknown as INodeComponent<NodeInfo>;
        if (start) {
          // EXPENSIVE filter
          const connectionsFromStartNode = elementList.filter((e) => {
            const element = e[1] as INodeComponent<NodeInfo>;
            return element.startNode?.id === node.id;
          });

          let connection: INodeComponent<NodeInfo> | undefined = undefined;

          if (connectionsFromStartNode && connectionsFromStartNode.length > 0) {
            connectionsFromStartNode.forEach((connectionNode) => {
              let end: INodeComponent<NodeInfo> | undefined = undefined;
              connection =
                connectionNode[1] as unknown as INodeComponent<NodeInfo>;

              if (connection && connection.endNode) {
                // EXPENSIVE find
                const endElement = elementList.find((e) => {
                  const element = e[1] as INodeComponent<NodeInfo>;
                  return (
                    connection &&
                    connection.endNode &&
                    element.id === connection.endNode.id
                  );
                });
                if (endElement) {
                  end = endElement[1] as unknown as INodeComponent<NodeInfo>;
                }
              }

              if (
                connection &&
                end &&
                this.canvasApp?.canvas &&
                connection.controlPoints &&
                connection.controlPoints.length === 2
              ) {
                if (
                  followPathByName &&
                  connection.startNodeThumb?.pathName !== followPathByName
                ) {
                  return;
                }

                connectionPairs.push({
                  start,
                  connection,
                  end,
                });
              }
            });
          }

          return connectionPairs;
        }
      }
      return false;
    };

    const timers: Map<NodeJS.Timer, () => void> = new Map();

    const animatePath = (
      nodeId: string,
      color: string,
      onNextNode?: (
        nodeId: string,
        node: INodeComponent<NodeInfo>,
        input: string
      ) => { result: boolean; output: string; followPathByName?: string },
      input?: string,
      followPathByName?: string // normal, success, failure, "subflow"
    ) => {
      const maxSpeed = 50;
      const currentSpeed = speedMeter;
      const nodeConnectionPairs = getNodeConnectionPairById(
        nodeId,
        followPathByName
      );

      if (nodeConnectionPairs && nodeConnectionPairs.length > 0) {
        nodeConnectionPairs.forEach((nodeConnectionPair) => {
          // TODO: check if nodeConnectionPair conforms to pathCondition

          const start = nodeConnectionPair.start;
          const connection = nodeConnectionPair.connection;
          const end = nodeConnectionPair.end;

          const testCircle = createElement(
            'div',
            {
              class: `absolute top-0 left-0 z-[1000] pointer-events-none origin-center flex text-center items-center justify-center w-[20px] h-[20px] overflow-hidden rounded cursor-pointer`,
              style: {
                'background-color': color,
                'clip-path': 'circle(50%)',
              },
            },
            this.canvasApp?.canvas.domElement,
            ''
          );

          const message = createElement(
            'div',
            {
              class: `flex text-center truncate min-w-0 overflow-hidden z-[1010] pointer-events-none origin-center px-2 bg-white text-black absolute top-[-100px] z-[1000] left-[-60px] items-center justify-center w-[80px] h-[100px] overflow-hidden cursor-pointer`,
              style: {
                'clip-path':
                  'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)',
              },
            },
            this.canvasApp?.canvas.domElement,
            ''
          );

          const messageText = createElement(
            'div',
            {
              class: `truncate min-w-0 overflow-hidden w-[80px] mt-[-30px]`,
            },
            message.domElement,
            input?.toString() ?? start.nodeInfo?.formValues?.Expression ?? ''
          );

          const domCircle = testCircle.domElement as HTMLElement;
          domCircle.style.display = 'none';
          const domMessage = message.domElement as HTMLElement;
          domMessage.style.display = 'none';
          domMessage.style.pointerEvents = 'none';

          let loop = 0;
          const onInterval = () => {
            if (
              start &&
              end &&
              start.onCalculateControlPoints &&
              end.onCalculateControlPoints &&
              connection &&
              connection.controlPoints &&
              connection.controlPoints.length === 2
            ) {
              const startHelper = start.onCalculateControlPoints(
                ControlAndEndPointNodeType.start,
                CurveType.bezierCubic,
                connection.startNodeThumb?.thumbType ??
                  ThumbType.StartConnectorCenter,
                connection.startNodeThumb?.thumbIndex,
                end,
                connection.startNodeThumb?.thumbOffsetY ?? 0
              );

              const endHelper = end.onCalculateControlPoints(
                ControlAndEndPointNodeType.end,
                CurveType.bezierCubic,
                connection.endNodeThumb?.thumbType ??
                  ThumbType.EndConnectorCenter,
                connection.endNodeThumb?.thumbIndex,
                start,
                connection.endNodeThumb?.thumbOffsetY ?? 0
              );

              const tx = 40;
              const ty = 40;
              const bezierCurvePoints = getPointOnCubicBezierCurve(
                Math.min(loop, 1),
                { x: startHelper.x + tx, y: startHelper.y + ty },
                {
                  x: startHelper.cx + tx,
                  y: startHelper.cy + ty,
                },
                {
                  x: endHelper.cx + tx,
                  y: endHelper.cy + ty,
                },
                { x: endHelper.x + tx, y: endHelper.y + ty }
              );

              domCircle.style.display = 'flex';
              domCircle.style.transform = `translate(${bezierCurvePoints.x}px, ${bezierCurvePoints.y}px)`;
              domMessage.style.display = 'flex';
              domMessage.style.transform = `translate(${bezierCurvePoints.x}px, ${bezierCurvePoints.y}px)`;

              loop += 0.015;
              if (loop > 1.015) {
                loop = 0;

                canvasApp?.elements.delete(testCircle.id);
                testCircle?.domElement?.remove();

                canvasApp?.elements.delete(message.id);
                message?.domElement?.remove();

                clearInterval(cancel);
                timers.delete(cancel);

                if (!onNextNode || onNextNode) {
                  const result = onNextNode?.(end.id, end, input ?? '') ?? {
                    result: true,
                    output: '',
                    followPathByName: undefined,
                  };
                  console.log('animatePath onNextNode result', input, result);
                  if (result.result) {
                    animatePath(
                      end.id,
                      color,
                      onNextNode,
                      result.output,
                      result.followPathByName
                    );
                  }
                }
              } else {
                if (speedMeter !== currentSpeed) {
                  clearInterval(cancel);
                  timers.delete(cancel);
                  cancel = setInterval(
                    onInterval,
                    (maxSpeed * (100 - speedMeter)) / 100
                  );
                  setCanceler();
                }
              }
            } else {
              if (start) {
                onNextNode && onNextNode(start.id, start, input ?? '');
              }
              canvasApp?.elements.delete(testCircle.id);
              testCircle?.domElement?.remove();

              canvasApp?.elements.delete(message.id);
              message?.domElement?.remove();

              clearInterval(cancel);
              timers.delete(cancel);
            }
          };

          let cancel = setInterval(
            onInterval,
            (maxSpeed * (100 - speedMeter)) / 100
          );

          const setCanceler = () => {
            timers.set(cancel, () => {
              clearInterval(cancel);
              timers.delete(cancel);
              cancel = setInterval(
                onInterval,
                (maxSpeed * (100 - speedMeter)) / 100
              );
              setCanceler();
            });
          };
          setCanceler();
        });
      }
    };

    // createElement(
    //   'button',
    //   {
    //     class: button,
    //     click: (event) => {
    //       event.preventDefault();

    //       const nodeId = getSelectedNode();
    //       if (nodeId) {
    //         const color =
    //           '#' + Math.floor(Math.random() * 16777215).toString(16);
    //         animatePath(nodeId, color);
    //       }
    //       return false;
    //     },
    //   },
    //   menubarElement.domElement,
    //   'move point over lines'
    // );

    createElement(
      'button',
      {
        class: `${button} relative top-[60px]`,
        click: (event) => {
          event.preventDefault();
          if (this.canvasApp?.elements) {
            run<NodeInfo>(this.canvasApp?.elements, animatePath);
          }
          return false;
        },
      },
      menubarElement.domElement,
      'run'
    );

    let speedMeter = 1;
    createElement(
      'input',
      {
        type: 'range',
        class: 'p-2 m-2 relative top-[60px]',
        name: 'speed',
        min: '0.1',
        max: '100',
        change: (event) => {
          speedMeter = parseInt((event.target as HTMLInputElement).value);

          const timerList = Array.from(timers ?? []);
          timerList.forEach((timer) => {
            timer[1]();
          });
        },
      },
      menubarElement.domElement,
      ''
    );

    const selectedNode = createElement(
      'div',
      {
        id: 'selectedNode',
        class: 'text-white',
      },
      menubarElement.domElement
    );

    // transform-origin: top left;
    // const canvas = createElement(
    //   'div',
    //   {
    //     id: 'canvas',
    //     class:
    //       'w-full h-full bg-slate-800 flex-auto relative z-10 origin-top-left transition-none',
    //   },
    //   rootElement
    // );

    const sidebarContainer = createElement(
      'div',
      {
        id: 'textAreaContainer',
        class:
          'fixed w-1/4 h-full top-0 right-0 left-auto z-50 p-2 bg-slate-400 hidden',
      },
      rootElement
    );

    // let raf = -1;
    // let inputTimeout = -1;

    // const textArea = createElement(
    //   'textarea',
    //   {
    //     id: 'textAreaCode',
    //     class: 'w-full h-full p-2 outline-none',
    //     input:
    //   },
    //   sidebarContainer.domElement
    // );

    let formElement: INodeComponent<NodeInfo> | undefined = undefined;
    let currentNodeElementId: string | undefined = undefined;

    const removeFormElement = () => {
      if (formElement) {
        canvasApp?.deleteElementFromNode(
          sidebarContainer as INodeComponent<NodeInfo>,
          formElement
        );
        formElement = undefined;
      }
    };

    createEffect(() => {
      const nodeElementId = getSelectedNode();
      console.log('selected nodeElement', nodeElementId);
      if (nodeElementId === currentNodeElementId) {
        return;
      }

      removeFormElement();
      if (nodeElementId) {
        const node = this.canvasApp?.elements?.get(nodeElementId);
        const nodeInfo: any = node?.nodeInfo ?? {};
        console.log('nodeInfo', nodeInfo);

        const [currentValue, setCurrentValue] = createNamedSignal(
          'test',
          (nodeInfo.formValues ?? {})['Expression'] ?? ''
        );

        const form = FormComponent({
          id: 'test',
          onSave: (values: any) => {
            console.log('onSave', values);

            const node = this.canvasApp?.elements?.get(nodeElementId);
            if (node) {
              if ((node.nodeInfo as any).formElements) {
                (node.nodeInfo as any).formValues = values;
              } else {
                node.nodeInfo = values;
              }
            }
            setCurrentValue(values['Expression']);
            removeFormElement();
            currentNodeElementId = undefined;

            selectedNode.domElement.textContent = '';
            (
              sidebarContainer.domElement as unknown as HTMLElement
            ).classList.add('hidden');
          },
          formElements: ((node?.nodeInfo as any)?.formElements ?? []).map(
            (item: any) => {
              return {
                ...item,
                value: ((node?.nodeInfo as any)?.formValues ?? {})[
                  item.fieldName
                ],
              };
            }
          ),
          // onInput: (event: InputEvent) => {
          //   const text =
          //     (event?.target as unknown as HTMLTextAreaElement)?.value ?? '';

          //   if (inputTimeout !== -1) {
          //     clearTimeout(inputTimeout);
          //     inputTimeout = -1;
          //   }
          //   inputTimeout = setTimeout(() => {
          //     if (raf !== -1) {
          //       window.cancelAnimationFrame(raf);
          //       raf = -1;
          //     }

          //     console.log('oninput', text);
          //     registerCustomBlock('frameUpdate');
          //     const compiledExpressionInfo = compileExpressionAsInfo(text);
          //     try {
          //       const compiledExpression = (
          //         new Function(
          //           'payload',
          //           `${compiledExpressionInfo.script}`
          //         ) as unknown as (payload?: any) => any
          //       ).bind(compiledExpressionInfo.bindings);
          //       const result = compiledExpression();

          //       // TODO : have this done by the compiler:
          //       if (result && result.frameUpdate) {
          //         result.frameUpdate = result.frameUpdate.bind(
          //           compiledExpressionInfo.bindings
          //         );

          //         /*
          //             test code:

          //             let a = 1;
          //             frameUpdate {
          //               setStartPoint(1,a);
          //               a=a+1;
          //             }

          //             TODO : implement deltaTime
          //             TODO : implement custom log function
          //         */

          //         const rafCallback = (deltaTime: number) => {
          //           result.frameUpdate(deltaTime);
          //           if (raf !== -1) {
          //             raf = window.requestAnimationFrame(rafCallback);
          //           }
          //         };
          //         raf = window.requestAnimationFrame(rafCallback);
          //       }
          //     } catch (error) {
          //       console.error('error compiling', error);
          //     }
          //   }, 100) as unknown as number;
          // },
        }) as unknown as HTMLElement;

        const formElementInstance = createElement(
          'div',
          {},
          sidebarContainer.domElement,
          form
        );
        formElement = formElementInstance as INodeComponent<NodeInfo>;

        selectedNode.domElement.textContent = `${nodeElementId}`;
        (
          sidebarContainer.domElement as unknown as HTMLElement
        ).classList.remove('hidden');
      } else {
        selectedNode.domElement.textContent = '';
        (sidebarContainer.domElement as unknown as HTMLElement).classList.add(
          'hidden'
        );
      }

      currentNodeElementId = nodeElementId;
    });

    // createMarkupElement(
    //   `
    //   <div class="bg-black" >
    //     <div>
    //       <div>
    //         <div style="background: white;" class="p-2">
    //           <h2>TITLE</h2>
    //           <p>subtitle</p>
    //           <div class="bg-red-300">
    //             <i style="color:blue;">lorem ipsummm<br></br></i>
    //             {20 + 30}
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    //   `,
    //   canvasApp.canvas.domElement,
    //   canvasApp.elements
    // );

    setupMarkupElement(
      `
      function Test() {
        return <div class="bg-black"><div class="p-4">test{2*3}</div></div>;
      }  
      return Test();  
    `,
      rootElement
    );

    // const element = TestApp({
    //   //parentClass: 'absolute top-0 left-0 bg-white z-[10000]',
    // }); //TestDummyComponent();
    // console.log('element', element);
    // rootElement.append(element as unknown as Node);

    registerCustomFunction('setStartPoint', [], (x: number, y: number) => {
      console.log('setStartPoint', x, y);
      if (bezierCurve) {
        bezierCurve.setStartPoint(x, y);
      }
    });
    registerCustomFunction('setControlPoint1', [], (x: number, y: number) => {
      console.log('setControlPoint1', x, y);
      if (bezierCurve) {
        bezierCurve.setControlPoint1(x, y);
      }
    });
    registerCustomFunction('setControlPoint2', [], (x: number, y: number) => {
      console.log('setControlPoint2', x, y);
      if (bezierCurve) {
        bezierCurve.setControlPoint2(x, y);
      }
    });
    registerCustomFunction('setEndPoint', [], (x: number, y: number) => {
      console.log('setEndPoint', x, y);
      if (bezierCurve) {
        bezierCurve.setEndPoint(x, y);
      }
    });
    registerCustomFunction('log', [], (message: any) => {
      console.log('log', message);
    });
  }
}
customElements.define('vps-web-root', AppElement);

/*const [getCount, setCount] = createSignal(0);
const [getValue, setValue] = createSignal('test');
createEffect(() => console.log('effect', getCount(), getValue()));
setCount(1);
setCount(2);
setValue('test2');
setCount(3);
*/
/*setInterval(() => {
  setCount(getCount() + 1);
}, 1000);
*/
