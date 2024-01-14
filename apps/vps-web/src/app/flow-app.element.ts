import './app.element.css';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import styles from '../styles.css?inline';
//import iconStyles from '../../public/icon-styles.css?inline';
import {
  createElement,
  IElementNode,
  INodeComponent,
  createEffect,
  getSelectedNode,
  setSelectNode,
  CanvasAppInstance,
  IRectNodeComponent,
  IThumbNodeComponent,
  Flow,
  updateNamedSignal,
  NodeType,
  SelectedNodeInfo,
  FlowNode,
} from '@devhelpr/visual-programming-system';

import { registerCustomFunction } from '@devhelpr/expression-compiler';

import { FormComponent } from './components/form-component';

import {
  connectionExecuteHistory,
  increaseRunIndex,
  resetRunIndex,
  run,
} from './simple-flow-engine/simple-flow-engine';
import { NodeInfo } from './types/node-info';
import {
  setSpeedMeter,
  timers,
  animatePath as _animatePath,
  animatePathFromThumb as _animatePathFromThumb,
  setCameraAnimation,
  setTargetCameraAnimation,
  setPositionTargetCameraAnimation,
  runCounter,
  resetRunCounter,
  setRunCounterResetHandler,
  setRunCounterUpdateElement,
} from './follow-path/animate-path';
import { OnNextNodeFunction } from './follow-path/OnNextNodeFunction';
import { getFollowNodeExecution } from './follow-path/followNodeExecution';
import {
  createIndexedDBStorageProvider,
  FlowrunnerIndexedDbStorageProvider,
} from './storage/indexeddb-storage-provider';
import { getPointOnConnection } from './follow-path/point-on-connection';
import { AppComponents } from './components/app-components';
import { NavbarComponents } from './components/navbar-components';
import {
  menubarClasses,
  navBarButton,
  navBarIconButtonInnerElement,
  navBarPrimaryIconButton,
  navBarOutlineButton,
} from './consts/classes';
import {
  getNodeFactoryNames,
  getNodeTaskFactory,
  setupCanvasNodeTaskRegistry,
} from './node-task-registry/canvas-node-task-registry';
import { serializeElementsMap } from './storage/serialize-canvas';
import { importToCanvas } from './storage/import-to-canvas';
import { NodeSidebarMenuComponents } from './components/node-sidebar-menu';
import { AppElement } from './app.element';
import { create } from 'domain';

export class FlowAppElement extends AppElement<NodeInfo> {
  public static observedAttributes = [];

  onclick = (_ev: MouseEvent) => {
    alert('clicked');
  };

  isStoring = false;

  storageProvider: FlowrunnerIndexedDbStorageProvider | undefined = undefined;

  scopeNodeDomElement: HTMLElement | undefined = undefined;

  formElement: INodeComponent<NodeInfo> | undefined = undefined;
  selectedNodeLabel: IElementNode<NodeInfo> | undefined = undefined;

  testCircle: IElementNode<NodeInfo> | undefined = undefined;
  message: IElementNode<NodeInfo> | undefined = undefined;
  messageText: IElementNode<NodeInfo> | undefined = undefined;

  constructor(appRootSelector: string) {
    super(appRootSelector);
    if (!this.rootElement) {
      return;
    }
    if (!this.canvasApp) {
      return;
    }

    const animatePath = (
      node: IRectNodeComponent<NodeInfo>,
      color: string,
      onNextNode?: OnNextNodeFunction,
      onStopped?: (input: string | any[]) => void,
      input?: string | any[],
      followPathByName?: string, // normal, success, failure, "subflow",
      animatedNodes?: {
        node1?: IElementNode<unknown>;
        node2?: IElementNode<unknown>;
        node3?: IElementNode<unknown>;
      },
      offsetX?: number,
      offsetY?: number,
      followPathToEndThumb?: boolean,
      singleStep?: boolean,
      followThumb?: string,
      scopeId?: string
    ) => {
      if (!this.canvasApp) {
        throw new Error('canvasApp not defined');
      }
      return _animatePath(
        this.canvasApp,
        node,
        color,
        onNextNode,
        onStopped,
        input,
        followPathByName,
        animatedNodes,
        offsetX,
        offsetY,
        followPathToEndThumb,
        singleStep,
        followThumb,
        scopeId
      );
    };

    const animatePathFromThumb = (
      node: IThumbNodeComponent<NodeInfo>,
      color: string,
      onNextNode?: OnNextNodeFunction,
      onStopped?: (input: string | any[], scopeId?: string) => void,
      input?: string | any[],
      followPathByName?: string, // normal, success, failure, "subflow",
      animatedNodes?: {
        node1?: IElementNode<unknown>;
        node2?: IElementNode<unknown>;
        node3?: IElementNode<unknown>;
      },
      offsetX?: number,
      offsetY?: number,
      followPathToEndThumb?: boolean,
      singleStep?: boolean,
      scopeId?: string
    ) => {
      if (!this.canvasApp) {
        throw new Error('canvasApp not defined');
      }
      return _animatePathFromThumb(
        this.canvasApp,
        node,
        color,
        onNextNode,
        onStopped,
        input,
        followPathByName,
        animatedNodes,
        offsetX,
        offsetY,
        followPathToEndThumb,
        singleStep,
        scopeId
      );
    };
    const canvasUpdated = () => {
      if (this.isStoring) {
        return;
      }
      resetConnectionSlider();
      store();
    };
    this.canvasApp.setOnCanvasUpdated(() => {
      canvasUpdated();
    });

    setCameraAnimation(this.canvasApp);

    setupCanvasNodeTaskRegistry(animatePath, animatePathFromThumb);
    createIndexedDBStorageProvider()
      .then((storageProvider) => {
        console.log('storageProvider', storageProvider);
        this.isStoring = true;
        this.storageProvider = storageProvider;

        if (this.storageProvider && this.canvasApp && this.rootElement) {
          NavbarComponents({
            clearCanvas: this.clearCanvas,
            initializeNodes: initializeNodes,
            storageProvider: this.storageProvider,
            selectNodeType: selectNodeType.domElement as HTMLSelectElement,
            animatePath: animatePath,
            animatePathFromThumb: animatePathFromThumb,
            canvasUpdated: canvasUpdated,
            canvasApp: this.canvasApp,
            removeElement: this.removeElement,
            rootElement: menubarElement.domElement as HTMLElement,
            rootAppElement: this.rootElement as HTMLElement,
            setIsStoring: setIsStoring,
            importToCanvas: (
              nodesList: FlowNode<NodeInfo>[],
              canvasApp: CanvasAppInstance<NodeInfo>,
              canvasUpdated: () => void,
              containerNode?: IRectNodeComponent<NodeInfo>,
              nestedLevel?: number,
              getNodeTaskFactory?: (name: string) => any
            ) => {
              this.isStoring = true;
              importToCanvas(
                nodesList,
                canvasApp,
                canvasUpdated,
                containerNode,
                nestedLevel,
                getNodeTaskFactory
              );
              this.isStoring = false;
              canvasUpdated();
            },
          }) as unknown as HTMLElement;

          createElement(
            'button',
            {
              class: navBarButton,
              click: (event) => {
                event.preventDefault();
                event.stopPropagation();
                initializeNodes();
                return false;
              },
            },
            menubarElement.domElement,
            'Reset state'
          );

          createElement(
            'button',
            {
              class: navBarOutlineButton,
              click: (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (confirm('Are you sure you want to clear the canvas?')) {
                  this.clearCanvas();
                  store();
                }
                return false;
              },
            },
            menubarElement.domElement,
            'Clear canvas'
          );

          this.selectedNodeLabel = createElement(
            'div',
            {
              id: 'selectedNode',
              class: 'text-white',
            },
            menubarElement.domElement
          );

          NodeSidebarMenuComponents({
            clearCanvas: this.clearCanvas,
            initializeNodes: initializeNodes,
            storageProvider: this.storageProvider,
            selectNodeType: selectNodeType.domElement as HTMLSelectElement,
            animatePath: animatePath,
            animatePathFromThumb: animatePathFromThumb,
            canvasUpdated: canvasUpdated,
            canvasApp: this.canvasApp,
            removeElement: this.removeElement,
            rootElement: this.rootElement as HTMLElement,
            rootAppElement: this.rootElement as HTMLElement,
            setIsStoring: setIsStoring,
            importToCanvas: (
              nodesList: FlowNode<NodeInfo>[],
              canvasApp: CanvasAppInstance<NodeInfo>,
              canvasUpdated: () => void,
              containerNode?: IRectNodeComponent<NodeInfo>,
              nestedLevel?: number,
              getNodeTaskFactory?: (name: string) => any
            ) => {
              this.isStoring = true;
              importToCanvas(
                nodesList,
                canvasApp,
                canvasUpdated,
                containerNode,
                nestedLevel,
                getNodeTaskFactory
              );
              this.isStoring = false;
              canvasUpdated();
            },
          }) as unknown as HTMLElement;
        }
        this.clearCanvas();
        storageProvider
          .getFlow('1234')
          .then((flow) => {
            if (!this.canvasApp) {
              throw new Error('canvasApp not defined');
            }
            importToCanvas(
              flow.flows.flow.nodes,
              this.canvasApp,
              canvasUpdated,
              undefined,
              0,
              getNodeTaskFactory
            );
            this.canvasApp.centerCamera();
            initializeNodes();
            this.isStoring = false;
          })
          .catch((error) => {
            console.log('error', error);
            this.isStoring = false;
          });
      })
      .catch((error) => {
        console.log('error', error);
      });

    const store = () => {
      if (this.storageProvider) {
        const nodesList = serializeFlow();
        if (!nodesList) {
          return;
        }
        console.log('nodesList', nodesList);
        const flow: Flow<NodeInfo> = {
          schemaType: 'flow',
          schemaVersion: '0.0.1',
          id: '1234',
          flows: {
            flow: {
              flowType: 'flow',
              nodes: nodesList,
            },
          },
        };
        this.storageProvider.saveFlow('1234', flow);
      }
    };

    const setIsStoring = (isStoring: boolean) => {
      this.isStoring = isStoring;
    };

    this.canvasApp.setOnCanvasClick(() => {
      console.log('OnCanvasClick');
      setSelectNode(undefined);
    });

    const menubarElement = createElement(
      'div',
      {
        class: menubarClasses,
      },
      this.rootElement
    );

    const initializeNodes = () => {
      if (!this.rootElement) {
        return;
      }
      const elements = this.rootElement.querySelectorAll('.state-active');
      elements.forEach((element) => {
        element.classList.remove('state-active');
      });

      this.canvasApp?.elements.forEach((node) => {
        const nodeComponent = node as unknown as INodeComponent<NodeInfo>;
        if (nodeComponent.nodeType !== NodeType.Connection) {
          if (nodeComponent?.nodeInfo?.initializeCompute) {
            nodeComponent.nodeInfo.initializeCompute();
          }
        }
      });
      resetRunIndex();
      (runButton.domElement as HTMLButtonElement).disabled = false;
      resetConnectionSlider();
    };

    const resetConnectionSlider = () => {
      (pathRange.domElement as HTMLElement).setAttribute('value', '0');
      (pathRange.domElement as HTMLElement).setAttribute('max', '0');
      connectionExecuteHistory.length = 0;
    };

    const serializeFlow = () => {
      if (!this.canvasApp) {
        return;
      }
      return serializeElementsMap(this.canvasApp.elements);
    };

    const runCounterElement = createElement(
      'div',
      {
        class:
          'absolute z-[10000] top-0 right-0 text-white px-2 py-1 m-2 bg-slate-900',
      },
      this.rootElement,
      ''
    );
    const runButton = createElement(
      'button',
      {
        class: `${navBarPrimaryIconButton}`,
        click: (event) => {
          event.preventDefault();
          (runButton.domElement as HTMLButtonElement).disabled = true;
          this.clearPathExecution();
          setRunCounterUpdateElement(
            runCounterElement.domElement as HTMLElement
          );
          removeFormElement();
          resetRunCounter();
          if (this.canvasApp?.elements) {
            this.canvasApp?.elements.forEach((node: IElementNode<NodeInfo>) => {
              if (
                node &&
                node.nodeInfo &&
                node.nodeInfo.initializeOnStartFlow
              ) {
                node.nodeInfo?.initializeCompute?.();
              }
            });
            (pathRange.domElement as HTMLButtonElement).disabled = true;
            run(
              this.canvasApp?.elements,
              this.canvasApp,
              animatePath,
              (input) => {
                console.log('run finished', input);
              }
            );

            setRunCounterResetHandler(() => {
              if (runCounter === 0) {
                (pathRange.domElement as HTMLButtonElement).disabled = false;
                (runButton.domElement as HTMLButtonElement).disabled = false;
                increaseRunIndex();
                (pathRange.domElement as HTMLElement).setAttribute(
                  'value',
                  '0'
                );
                (pathRange.domElement as HTMLElement).setAttribute(
                  'max',
                  (connectionExecuteHistory.length * 1000).toString()
                );
              }
            });
          }
          return false;
        },
      },
      menubarElement.domElement
    );
    createElement(
      'span',
      {
        class: `${navBarIconButtonInnerElement} icon-play_arrow`,
      },
      runButton.domElement
    );

    let speedMeter = 500;
    createElement(
      'input',
      {
        type: 'range',
        class: 'p-2 m-2 relative ', //top-[60px]',
        name: 'speed',
        min: '0.1',
        max: '1000',
        value: '1000',
        change: (event) => {
          speedMeter = parseInt((event.target as HTMLInputElement).value);
          setSpeedMeter(speedMeter);
          const timerList = Array.from(timers ?? []);
          timerList.forEach((timer) => {
            timer[1](); // call timer canceler
          });
        },
      },
      menubarElement.domElement,
      ''
    );

    const createOption = (
      selectElement: HTMLSelectElement,
      value: string,
      text: string,
      categoryName: string
    ) => {
      let category = selectElement.querySelector(
        "[data-category='" + categoryName + "']"
      );
      if (!category) {
        const optgroup = createElement(
          'optgroup',
          {
            label: categoryName,
            'data-category': categoryName,
          },
          selectElement
        );
        category = optgroup.domElement as HTMLElement;
      }
      const option = createElement(
        'option',
        {
          value: value,
        },
        category as HTMLElement,
        text
      );
      return option;
    };

    const selectNodeType = createElement(
      'select',
      {
        type: 'select',
        class: 'p-2 m-2 relative ', //top-[60px]',
        name: 'select-node-type',
        change: (_event) => {
          //
        },
      },
      menubarElement.domElement,
      ''
    );
    const setupTasksInDropdown = () => {
      if (selectNodeType?.domElement) {
        const nodeType = (selectNodeType?.domElement as HTMLSelectElement)
          .value;
        let isPreviouslySelectedNodeTypeInDropdown = false;
        (selectNodeType.domElement as HTMLSelectElement).innerHTML = '';

        const createOptgroup = (categoryName: string) =>
          createElement(
            'optgroup',
            {
              label: categoryName,
              'data-category': categoryName,
            },
            selectNodeType.domElement as HTMLSelectElement
          );
        createOptgroup('expression');
        createOptgroup('flow-control');
        createOptgroup('iterators');
        createOptgroup('variables');
        createOptgroup('connectivity');
        createOptgroup('functions');
        createOptgroup('string');
        createOptgroup('variables-array');
        createOptgroup('variables-dictionary');
        createOptgroup('variables-grid');
        createOptgroup('variables-set');

        const nodeTasks = getNodeFactoryNames();
        nodeTasks.forEach((nodeTask) => {
          const factory = getNodeTaskFactory(nodeTask);
          let categoryName = 'Default';
          if (factory) {
            const node = factory(canvasUpdated);
            if (node.isContained) {
              return;
            }
            categoryName = node.category || 'uncategorized';
          }
          if (nodeTask === nodeType) {
            isPreviouslySelectedNodeTypeInDropdown = true;
          }
          createOption(
            selectNodeType.domElement as HTMLSelectElement,
            nodeTask,
            nodeTask,
            categoryName
          );
        });
        if (isPreviouslySelectedNodeTypeInDropdown) {
          (selectNodeType?.domElement as HTMLSelectElement).value = nodeType;
        } else {
          const firstNodeOfFirstOptgroupElement = (
            selectNodeType?.domElement as HTMLSelectElement
          ).querySelector('optgroup')?.firstChild;
          if (firstNodeOfFirstOptgroupElement) {
            const defaultSelectedNodeType = (
              firstNodeOfFirstOptgroupElement as HTMLElement
            ).getAttribute('value');
            if (defaultSelectedNodeType) {
              (selectNodeType?.domElement as HTMLSelectElement).value =
                defaultSelectedNodeType;
            }
          }
        }
      }
    };

    const setupTasksForContainerTaskInDropdown = (
      allowedNodeTasks: string[]
    ) => {
      if (selectNodeType?.domElement) {
        (selectNodeType.domElement as HTMLSelectElement).innerHTML = '';

        const nodeTasks = getNodeFactoryNames();
        nodeTasks.forEach((nodeTask) => {
          const factory = getNodeTaskFactory(nodeTask);
          if (factory) {
            const node = factory(canvasUpdated);
            if (allowedNodeTasks.indexOf(node.name) < 0) {
              return;
            }
          }
          createOption(
            selectNodeType.domElement as HTMLSelectElement,
            nodeTask,
            nodeTask,
            'Contained nodes'
          );
        });
      }
    };
    setupTasksInDropdown();

    this.testCircle = createElement(
      'div',
      {
        class: `absolute bg-blue-500 top-0 left-0 z-[1000] pointer-events-none origin-center flex text-center items-center justify-center w-[20px] h-[20px] overflow-hidden rounded hidden`,
        style: {
          'clip-path': 'circle(50%)',
        },
      },
      this.canvasApp?.canvas.domElement,
      ''
    );

    // eslint-disable-next-line prefer-const
    this.message = createElement(
      'div',
      {
        class: `flex text-center truncate min-w-0 overflow-hidden z-[1010] pointer-events-auto origin-center px-2 bg-blue-500 text-black absolute top-[-100px] z-[1000] left-[-60px] items-center justify-center w-[80px] h-[100px] overflow-hidden hidden`,
        style: {
          'clip-path':
            'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)',
        },
      },
      this.canvasApp?.canvas.domElement,
      ''
    );

    this.messageText = createElement(
      'div',
      {
        class: `truncate min-w-0 overflow-hidden w-[80px] mt-[-30px]`,
      },
      this.message.domElement,
      ''
    );

    const bgRange = createElement(
      'div',
      {
        class:
          'p-2 absolute bottom-[20px] w-full h-[50px] bg-slate-200 items-center z-[1050] flex', //flex',
        name: 'path-track-bg',
      },
      this.rootElement,
      ''
    );

    const showProgressOnPathExecution = (sliderValue: number) => {
      if (this.scopeNodeDomElement) {
        this.scopeNodeDomElement.classList.remove('bg-blue-300');
        this.scopeNodeDomElement = undefined;
      }
      const max = connectionExecuteHistory.length * 1000;
      const stepSize = max / connectionExecuteHistory.length;
      const step = Math.floor(sliderValue / stepSize);

      if (step >= connectionExecuteHistory.length) {
        return;
      }
      const pathStep = connectionExecuteHistory[step];
      if (!pathStep.connection.startNode || !pathStep.connection.endNode) {
        return;
      }
      const node = pathStep.connection.startNode;
      this.canvasApp?.setNodeStates(pathStep.nodeStates);

      // if (pathStep.scopeNode) {
      //   this.scopeNodeDomElement = (
      //     pathStep.scopeNode.domElement as HTMLElement
      //   ).firstChild as HTMLElement;
      //   this.scopeNodeDomElement.classList.add('bg-blue-300');
      // }
      // connectionExecuteHistory.forEach((path) => {
      //   const connection = path.connection;
      //   if (connection.startNode && connection.startNode.domElement) {
      //     (
      //       (connection.startNode.domElement as HTMLElement)
      //         .firstChild as HTMLElement
      //     ).classList.remove('bg-blue-400');
      //   }
      //   if (connection.endNode && connection.endNode.domElement) {
      //     (
      //       (connection.endNode.domElement as HTMLElement)
      //         .firstChild as HTMLElement
      //     ).classList.remove('bg-blue-400');
      //   }
      // });
      if (node && node.domElement) {
        // (
        //   (node.domElement as HTMLElement).firstChild as HTMLElement
        // ).classList.add('bg-blue-400');

        const pointValue = sliderValue - step * stepSize;
        const percentage = pointValue / stepSize;

        // let loop = 0;
        // while (loop < connectionExecuteHistory.length) {
        //   const connectionExecute = connectionExecuteHistory[loop];
        //   const connection = connectionExecute.connection;
        //   if (connection?.startNode) {
        //     if (
        //       connection.startNode &&
        //       connection.startNode.nodeInfo &&
        //       connection.startNode.nodeInfo.setValue
        //     ) {
        //       if (loop > step) {
        //         connection.startNode.nodeInfo.setValue(
        //           connectionExecute.connectionValue
        //         );
        //       } else {
        //         //connection.startNode.nodeInfo.setValue(connectionExecute.output);
        //       }
        //     }
        //   }
        //   loop++;
        // }
        if (
          sliderValue % stepSize !== 0 &&
          step < connectionExecuteHistory.length
        ) {
          (this.testCircle?.domElement as HTMLElement).classList.remove(
            'hidden'
          );
          (this.message?.domElement as HTMLElement).classList.remove('hidden');

          if (pathStep.connection.endNode && pathStep.connection) {
            const bezierCurvePoints = getPointOnConnection<NodeInfo>(
              percentage,
              pathStep.connection,
              node,
              pathStep.connection.endNode
            );
            const domCircle = this.testCircle?.domElement as HTMLElement;
            const domMessage = this.message?.domElement as HTMLElement;
            const domMessageText = this.messageText?.domElement as HTMLElement;
            domCircle.style.display = 'flex';
            domCircle.style.transform = `translate(${bezierCurvePoints.x}px, ${bezierCurvePoints.y}px)`;
            domMessage.style.display = 'flex';
            domMessage.style.transform = `translate(${bezierCurvePoints.x}px, ${bezierCurvePoints.y}px)`;
            domMessageText.textContent = pathStep.connectionValue.toString();
            domMessage.title = pathStep.connectionValue.toString();
          } else {
            // pathStep.connection.startNode.connections.forEach((connection) => {
            //   if (
            //     connection.endNode?.id === pathStep.nodeId &&
            //     connection.startNode?.id === nextNodeId
            //   ) {
            //     const bezierCurvePoints = getPointOnConnection<NodeInfo>(
            //       percentage,
            //       connection,
            //       connection.startNode,
            //       connection.endNode
            //     );
            //     const domCircle = this.testCircle?.domElement as HTMLElement;
            //     const domMessage = this.message?.domElement as HTMLElement;
            //     const domMessageText = this.messageText
            //       ?.domElement as HTMLElement;
            //     domCircle.style.display = 'flex';
            //     domCircle.style.transform = `translate(${bezierCurvePoints.x}px, ${bezierCurvePoints.y}px)`;
            //     domMessage.style.display = 'flex';
            //     domMessage.style.transform = `translate(${bezierCurvePoints.x}px, ${bezierCurvePoints.y}px)`;
            //     domMessageText.textContent = pathStep.output.toString();
            //     domMessage.title = pathStep.output.toString();
            //   }
            // });
          }
          //}
        }
      }
    };

    const pathRange = createElement(
      'input',
      {
        type: 'range',
        class: 'p-2 m-2 relative w-full', //top-[60px]',
        name: 'path-track',
        min: '0',
        max: '100000',
        disabled: 'disabled',
        value: 1,
        input: (event) => {
          const value = parseInt((event.target as HTMLInputElement).value);
          if (!isNaN(value)) {
            showProgressOnPathExecution(value);
          }
        },
      },
      bgRange.domElement,
      ''
    );
    const labelPathRange = createElement(
      'label',
      {
        class: ' whitespace-nowrap text-black p-2',
        for: pathRange.id,
      },
      bgRange.domElement,
      'Timeline'
    );
    pathRange.domElement.before(labelPathRange.domElement);

    AppComponents({
      rootElement: this.rootElement,
    }) as unknown as HTMLElement;

    //);
    // let raf = -1;
    // let inputTimeout = -1;

    let currentSelectedNode: SelectedNodeInfo | undefined = undefined;

    const removeFormElement = () => {
      if (this.formElement) {
        this.canvasApp?.deleteElementFromNode(
          this.editPopupContainer as INodeComponent<NodeInfo>,
          this.formElement
        );
        this.formElement = undefined;
      }
      (
        this.editPopupContainer?.domElement as unknown as HTMLElement
      ).classList.add('hidden');
      (
        this.editPopupLineContainer?.domElement as unknown as HTMLElement
      ).classList.add('hidden');

      (
        this.editPopupEditingNodeIndicator?.domElement as unknown as HTMLElement
      ).classList.add('hidden');

      (
        this.editPopupEditingNodeIndicator?.domElement as unknown as HTMLElement
      ).classList.remove('editing-node-indicator');
    };

    createEffect(() => {
      const selectedNodeInfo = getSelectedNode();
      console.log('selected nodeElement...', selectedNodeInfo);
      if (!this.rootElement) {
        return;
      }
      this.rootElement.querySelectorAll('.selected').forEach((element) => {
        element.classList.remove('selected');
      });

      if (
        currentSelectedNode &&
        (!selectedNodeInfo || selectedNodeInfo.id !== currentSelectedNode.id)
      ) {
        const node = (
          currentSelectedNode?.containerNode
            ? (currentSelectedNode?.containerNode.nodeInfo as any)
                ?.canvasAppInstance?.elements
            : this.canvasApp?.elements
        )?.get(currentSelectedNode.id);
        if (node) {
          if (node.nodeType === NodeType.Connection) {
            node.connectorWrapper?.classList?.remove('selected');
          } else {
            node.domElement.classList.remove('selected');
          }
        }
      }

      removeFormElement();
      if (selectedNodeInfo && this.selectedNodeLabel) {
        this.selectedNodeLabel.domElement.textContent = 'NODE'; //`${selectedNodeInfo.id}`;
        const node = (
          selectedNodeInfo?.containerNode
            ? (selectedNodeInfo?.containerNode.nodeInfo as any)
                ?.canvasAppInstance?.elements
            : this.canvasApp?.elements
        )?.get(selectedNodeInfo.id);

        if (!node) {
          return;
        }
        if (node.nodeType === NodeType.Connection) {
          console.log('selected connection', node);
          node.connectorWrapper?.domElement?.classList?.add('selected');
        } else {
          node.domElement.classList.add('selected');
          if (getFollowNodeExecution()) {
            setTargetCameraAnimation(node.x, node.y, node.id, 1.0);
          }
        }
        const nodeInfo: any = node?.nodeInfo ?? {};
        if (
          node &&
          (node as INodeComponent<NodeInfo>).nodeType === NodeType.Connection
        ) {
          (
            this.editPopupContainer?.domElement as unknown as HTMLElement
          ).classList.add('hidden');
          (
            this.editPopupLineContainer?.domElement as unknown as HTMLElement
          ).classList.add('hidden');

          (
            this.editPopupEditingNodeIndicator
              ?.domElement as unknown as HTMLElement
          ).classList.add('hidden');

          (
            this.editPopupEditingNodeIndicator
              ?.domElement as unknown as HTMLElement
          ).classList.remove('editing-node-indicator');

          return;
        }

        console.log('nodeInfo', nodeInfo);

        const factory = getNodeTaskFactory(nodeInfo.type);
        if (factory) {
          const nodeTask = factory(() => undefined);
          if ((nodeTask.childNodeTasks || []).length > 0) {
            setupTasksForContainerTaskInDropdown(nodeTask.childNodeTasks ?? []);
          } else {
            setupTasksInDropdown();
          }
        }

        if (
          getFollowNodeExecution() ||
          (((nodeInfo as any)?.formElements ?? []).length <= 1 &&
            !(
              nodeInfo.showFormOnlyInPopup && nodeInfo.formElements.length >= 1
            ))
        ) {
          (
            this.editPopupContainer?.domElement as unknown as HTMLElement
          ).classList.add('hidden');
          (
            this.editPopupLineContainer?.domElement as unknown as HTMLElement
          ).classList.add('hidden');
          (
            this.editPopupEditingNodeIndicator
              ?.domElement as unknown as HTMLElement
          ).classList.add('hidden');

          (
            this.editPopupEditingNodeIndicator
              ?.domElement as unknown as HTMLElement
          ).classList.remove('editing-node-indicator');

          return;
        }

        const formElementInstance = createElement(
          'div',
          {},
          this.editPopupContainer?.domElement,
          undefined
        );
        this.formElement = formElementInstance as INodeComponent<NodeInfo>;

        FormComponent({
          rootElement: this.formElement.domElement as HTMLElement,
          id: selectedNodeInfo.id,
          hasSubmitButton: false,
          onSave: (values: any) => {
            console.log('onSave', values);

            this.rootElement
              ?.querySelectorAll('.selected')
              .forEach((element) => {
                element.classList.remove('selected');
              });

            const node = (
              selectedNodeInfo?.containerNode
                ? (selectedNodeInfo?.containerNode.nodeInfo as any)
                    ?.canvasAppInstance?.elements
                : this.canvasApp?.elements
            )?.get(selectedNodeInfo.id);
            if (node) {
              if ((node.nodeInfo as any).formElements) {
                (node.nodeInfo as any).formValues = values;
                Object.entries(values).forEach(([key, value]) => {
                  console.log(
                    'updateNamedSignal',
                    selectedNodeInfo.id + '_' + key,
                    value
                  );
                  updateNamedSignal(
                    selectedNodeInfo.id + '_' + key,
                    value as unknown as string
                  );
                });
              } else {
                node.nodeInfo = values;
              }
            }

            removeFormElement();
            currentSelectedNode = undefined;

            if (this.selectedNodeLabel) {
              this.selectedNodeLabel.domElement.textContent = '';
            }
            (
              this.editPopupContainer?.domElement as unknown as HTMLElement
            ).classList.add('hidden');
            (
              this.editPopupLineContainer?.domElement as unknown as HTMLElement
            ).classList.add('hidden');

            (
              this.editPopupEditingNodeIndicator
                ?.domElement as unknown as HTMLElement
            ).classList.add('hidden');

            (
              this.editPopupEditingNodeIndicator
                ?.domElement as unknown as HTMLElement
            ).classList.remove('editing-node-indicator');
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
        }) as unknown as HTMLElement;
        console.log('before positionPopup1');
        this.positionPopup(node);
      } else {
        if (this.selectedNodeLabel) {
          this.selectedNodeLabel.domElement.textContent = '';
        }
        (
          this.editPopupContainer?.domElement as unknown as HTMLElement
        ).classList.add('hidden');
        (
          this.editPopupLineContainer?.domElement as unknown as HTMLElement
        ).classList.add('hidden');
        (
          this.editPopupEditingNodeIndicator
            ?.domElement as unknown as HTMLElement
        ).classList.add('hidden');

        (
          this.editPopupEditingNodeIndicator
            ?.domElement as unknown as HTMLElement
        ).classList.remove('editing-node-indicator');

        setupTasksInDropdown();
        if (getSelectedNode()) {
          setSelectNode(undefined);
        }
      }

      currentSelectedNode = selectedNodeInfo;
    });

    // setupMarkupElement(
    //   `
    //   function Test() {
    //     return <div class="bg-black"><div class="p-4">test{2*3}</div></div>;
    //   }
    //   return Test();
    // `,
    //   this.rootElement
    // );

    registerCustomFunction('log', [], (message: any) => {
      console.log('log', message);
    });

    registerCustomFunction('pow', [], (a = 0, b = 0) => {
      return Math.pow(a, b);
    });

    registerCustomFunction('max', [], (a = 0, b = 0) => {
      return Math.max(a, b);
    });

    registerCustomFunction('min', [], (a = 0, b = 0) => {
      return Math.min(a, b);
    });

    registerCustomFunction('parseFloat', [], (a = 0) => {
      return parseFloat(a) || 0;
    });

    registerCustomFunction('isEmptyString', [], (a = '') => {
      return typeof a === 'string' && a === '';
    });
    registerCustomFunction('isEmptyText', [], (a = '') => {
      return typeof a === 'string' && a === '';
    });

    registerCustomFunction('hasText', [], (a = '') => {
      return typeof a === 'string' && a !== '' && a !== undefined && a !== null;
    });

    this.canvasApp?.setOnWheelEvent((x, y, scale) => {
      setPositionTargetCameraAnimation(x, y, scale);
    });

    this.canvasApp?.setonDragCanvasEvent((x, y) => {
      setPositionTargetCameraAnimation(x, y);
    });
  }

  onShouldPositionPopup = (node: IRectNodeComponent<NodeInfo>) => {
    const nodeInfo = node?.nodeInfo ?? {};
    if (node && node.nodeType === NodeType.Connection) {
      return false;
    }

    if ((nodeInfo?.formElements ?? []).length === 0) {
      return false;
    }
    if (!this.formElement) {
      return false;
    }
    return true;
  };

  onPreRemoveElement = (element: IElementNode<NodeInfo>) => {
    if (element.nodeInfo?.delete) {
      element.nodeInfo.delete();
    }
  };

  onPreclearCanvas = () => {
    this.clearPathExecution();
  };

  clearPathExecution = () => {
    if (this.scopeNodeDomElement) {
      this.scopeNodeDomElement.classList.remove('bg-blue-300');
    }
    // connectionExecuteHistory.forEach((connectionExecute) => {
    //   const connection = connectionExecute.connection;
    //   if (connection.startNode && connection.startNode.domElement) {
    //     (
    //       connection.startNode.domElement.firstChild as HTMLElement
    //     )?.classList.remove('bg-blue-400');
    //   }
    // });
    const domCircle = this.testCircle?.domElement as HTMLElement;
    const domMessage = this.message?.domElement as HTMLElement;
    domCircle.style.display = 'none';
    domMessage.style.display = 'none';
    domCircle.classList.add('hidden');
    domMessage.classList.add('hidden');
  };
}
