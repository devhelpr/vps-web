import { compileMarkup, IASTTreeNode } from '@devhelpr/markup-compiler';
import {
  compileExpression,
  runExpression,
} from '@devhelpr/expression-compiler';
import {
  DOMElementNode,
  ElementNodeMap,
  IElementNode,
} from '../interfaces/element';
import { IPointerDownResult } from '../interfaces/pointers';
import { createElement } from '../utils/create-element';
import { pointerDown, pointerMove, pointerUp } from './events/pointer-events';

export const createMarkupElement = (
  markup: string,
  canvasElement: DOMElementNode,
  elements: ElementNodeMap
) => {
  const compiledMarkup = compileMarkup(markup);
  if (!compiledMarkup) {
    throw new Error('Invalid markup');
  }

  let interactionInfo: IPointerDownResult = {
    xOffsetWithinElementOnFirstClick: 0,
    yOffsetWithinElementOnFirstClick: 0,
  };

  let element: IElementNode | undefined = undefined;

  element = createElement(
    compiledMarkup.body.tagName || 'div',
    {
      class:
        'absolute p-10 select-none cursor-pointer text-center transition-transform ease-in-out duration-[75ms]',
      style: {
        'background-color':
          '#' + Math.floor(Math.random() * 16777215).toString(16),
        transform: `translate(${Math.floor(
          Math.random() * 1024
        )}px, ${Math.floor(Math.random() * 500)}px)`,
      },
      /*click: () => {
        console.log(element);
        if (element) {
          element.domElement.style.backgroundColor =
            '#' + Math.floor(Math.random() * 16777215).toString(16);
        }
      },
      */
      pointerdown: (e: PointerEvent) => {
        if (element) {
          const domElement = element.domElement as unknown as
            | HTMLElement
            | SVGElement;
          const elementRect = domElement.getBoundingClientRect();
          interactionInfo = pointerDown(
            e.clientX - elementRect.x,
            e.clientY - elementRect.y,
            element,
            canvasElement
          );
        }
      },
      pointermove: (e: PointerEvent) => {
        const canvasRect = (
          canvasElement as unknown as HTMLElement | SVGElement
        ).getBoundingClientRect();
        if (element) {
          if (element && element.domElement) {
            pointerMove(
              e.clientX - canvasRect.x,
              e.clientY - canvasRect.y,
              element,
              canvasElement,
              interactionInfo
            );
          }
        }
      },
      pointerup: (e: PointerEvent) => {
        if (element) {
          if (element && element.domElement) {
            const canvasRect = (
              canvasElement as unknown as HTMLElement | SVGElement
            ).getBoundingClientRect();
            pointerUp(
              e.clientX - canvasRect.x,
              e.clientY - canvasRect.y,
              element,
              canvasElement,
              interactionInfo
            );
          }
        }
      },
      pointerleave: (e: PointerEvent) => {
        console.log('pointerleave element', event);
      },
    },
    canvasElement,
    ''
  );
  if (element && element.domElement) {
    console.log('compiledMarkup', compiledMarkup);
    if (compiledMarkup && element && element.domElement) {
      createASTNodeElement(
        compiledMarkup.body,
        element.domElement,
        element.elements
      );
    }
    const domElement = element.domElement as unknown as
      | HTMLElement
      | SVGElement;
    domElement.id = element.id;
    elements.set(element.id, element);
  }
};

export const createASTNodeElement = (
  astNode: IASTTreeNode,
  parentElement: DOMElementNode,
  elements: IElementNode[]
) => {
  let element: IElementNode | undefined = undefined;
  const elementProperties: any = {};
  astNode.properties?.forEach((propertyKeyValue) => {
    elementProperties[propertyKeyValue.propertyName] = propertyKeyValue.value;
  });
  let text = astNode.value ?? '';
  if (astNode.type === 'EXPRESSION') {
    const compiledExpression = compileExpression(astNode.value || '');
    text = runExpression(compiledExpression, {});
  }
  element = createElement(
    astNode.tagName ?? 'div',
    elementProperties,
    parentElement,
    text
  );

  if (element) {
    (element.domElement as unknown as HTMLElement | SVGElement).id = element.id;
    elements.push(element);

    astNode.body?.forEach((childASTNode) => {
      createASTNodeElement(
        childASTNode,
        element!.domElement,
        element!.elements
      );
    });
  }
};
