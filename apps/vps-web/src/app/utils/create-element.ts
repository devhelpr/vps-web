import { DOMElementNode, IElementNode } from '../interfaces/element';

type EventHandler = (event: Event) => void | boolean;

export const createElement = (
  elementName: string,
  attributes?: Record<string, string | number | object | EventHandler>,
  parent?: DOMElementNode,
  content?: string
): IElementNode => {
  const id = crypto.randomUUID();
  const domElement = document.createElement(elementName);
  if (attributes) {
    Object.keys(attributes).forEach((key) => {
      if (typeof attributes[key] === 'object') {
        Object.keys(attributes[key]).forEach((styleProperty: string) => {
          console.log(
            styleProperty,
            (attributes[key] as unknown as any)[styleProperty]
          );
          domElement.style.setProperty(
            styleProperty,
            (attributes[key] as unknown as any)[styleProperty]
          );
        });
      } else if (typeof attributes[key] === 'function') {
        domElement.addEventListener(key, attributes[key] as EventHandler);
      } else if (typeof attributes[key] === 'string') {
        domElement.setAttribute(key, attributes[key] as string);
      } else if (typeof attributes[key] === 'number') {
        domElement.setAttribute(key, attributes[key].toString());
      }
    });
  }
  if (parent) {
    parent.appendChild(domElement);
  }
  if (content) {
    domElement.textContent = content;
  }
  return {
    id: id,
    domElement: domElement,
    elements: [],
  };
};

export const createNSElement = (
  elementName: string,
  attributes?: Record<string, string | number | object | EventHandler>,
  parent?: DOMElementNode,
  content?: string
): IElementNode => {
  const id = crypto.randomUUID();
  const domElement = document.createElementNS(
    'http://www.w3.org/2000/svg',
    elementName
  );
  if (attributes) {
    Object.keys(attributes).forEach((key) => {
      if (typeof attributes[key] === 'object') {
        Object.keys(attributes[key]).forEach((styleProperty: string) => {
          console.log(
            styleProperty,
            (attributes[key] as unknown as any)[styleProperty]
          );
          domElement.style.setProperty(
            styleProperty,
            (attributes[key] as unknown as any)[styleProperty]
          );
        });
      } else if (typeof attributes[key] === 'function') {
        domElement.addEventListener(key, attributes[key] as EventHandler);
      } else if (typeof attributes[key] === 'string') {
        domElement.setAttribute(key, attributes[key] as string);
      } else if (typeof attributes[key] === 'number') {
        domElement.setAttribute(key, attributes[key].toString());
      }
    });
  }
  if (parent) {
    parent.appendChild(domElement);
  }
  if (content) {
    domElement.textContent = content;
  }
  return {
    id: id,
    domElement: domElement,
    elements: [],
  };
};
