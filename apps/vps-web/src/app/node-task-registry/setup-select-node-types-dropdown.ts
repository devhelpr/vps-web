import { createElement } from '@devhelpr/visual-programming-system';
import {
  canvasNodeTaskRegistryLabels,
  getNodeFactoryNames,
  getNodeTaskFactory,
} from './canvas-node-task-registry';
import { createOption } from './createOption';

export const setupTasksInDropdown = (
  selectNodeTypeHTMLElement: HTMLSelectElement,
  isInComposition?: boolean,
  compositionId?: string
) => {
  if (selectNodeTypeHTMLElement) {
    const nodeType = selectNodeTypeHTMLElement.value;
    let isPreviouslySelectedNodeTypeInDropdown = false;
    selectNodeTypeHTMLElement.innerHTML = '';

    const createOptgroup = (categoryName: string) =>
      createElement(
        'optgroup',
        {
          label: categoryName,
          'data-category': categoryName,
        },
        selectNodeTypeHTMLElement
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
    createOptgroup('Compositions');

    const nodeTasks = getNodeFactoryNames();
    nodeTasks.forEach((nodeTask) => {
      const factory = getNodeTaskFactory(nodeTask);
      let categoryName = 'Default';
      if (factory) {
        const node = factory(() => {
          // dummy canvasUpdated function
        });
        if (node.isContained) {
          return;
        }
        if (node.hideFromNodeTypeSelector) {
          if (
            !isInComposition ||
            (isInComposition && !node.useInCompositionOnly)
          ) {
            return;
          }
        }
        if (
          isInComposition &&
          nodeTask === `composition-${compositionId}` &&
          compositionId
        ) {
          return;
        }
        categoryName = node.category || 'uncategorized';
      }
      if (nodeTask === nodeType) {
        isPreviouslySelectedNodeTypeInDropdown = true;
      }
      const label = canvasNodeTaskRegistryLabels[nodeTask] || nodeTask;
      createOption(selectNodeTypeHTMLElement, nodeTask, label, categoryName);
    });
    if (isPreviouslySelectedNodeTypeInDropdown) {
      selectNodeTypeHTMLElement.value = nodeType;
    } else {
      const firstNodeOfFirstOptgroupElement =
        selectNodeTypeHTMLElement.querySelector('optgroup')?.firstChild;
      if (firstNodeOfFirstOptgroupElement) {
        const defaultSelectedNodeType = (
          firstNodeOfFirstOptgroupElement as HTMLElement
        ).getAttribute('value');
        if (defaultSelectedNodeType) {
          selectNodeTypeHTMLElement.value = defaultSelectedNodeType;
        }
      }
    }
  }
};
