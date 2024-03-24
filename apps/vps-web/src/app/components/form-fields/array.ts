import {
  BaseComponent,
  createTemplate,
  createElementFromTemplate,
  Component,
} from '@devhelpr/dom-components';
import { trackNamedSignal } from '@devhelpr/visual-programming-system';
import { BaseFormFieldProps, FormFieldComponent } from './field';
import { FormField } from '../FormField';
import { primaryButton } from '../../consts/classes';

export interface ArrayFieldProps extends BaseFormFieldProps {
  formId: string;
  fieldName: string;
  label?: string;
  isLast?: boolean;
  values: unknown[];
  formElements: FormField[];
  createFormDialog: (
    formElements: FormField[],
    values?: unknown
  ) => Promise<unknown>;
  createDataReadElement: (formElement: FormField, data: unknown) => HTMLElement;
  onChange?: (value: unknown[]) => void;
}

export class ArrayFieldChildComponent extends FormFieldComponent<ArrayFieldProps> {
  oldProps: ArrayFieldProps | null = null;
  addButton: HTMLInputElement | null = null;
  array: HTMLDivElement | null = null;
  label: HTMLLabelElement | null = null;
  doRenderChildren = false;
  initialRender = false;

  values: { id: string; arrayItems: unknown }[] = [];
  components: Component<FormFieldComponent<FormField>>[] = [];

  constructor(parent: BaseComponent | null, props: ArrayFieldProps) {
    super(parent, props);
    this.fieldName = props.fieldName;
    this.values = props.values.map((value) => {
      return { id: crypto.randomUUID(), arrayItems: value };
    });
    this.template = createTemplate(
      `<div class="w-full ${props.isLast ? '' : 'mb-2'}">
        <label for="${props.fieldName}" class="block  mb-2 ${
        props.settings?.textLabelColor ?? 'text-white'
      }">${props.label ?? props.fieldName}</label>
        <div class="_flex flex-col table"></div>
        <button class="${primaryButton}"
          type="button"
          id="${props.formId}_${props.fieldName}"          
          type="text">Add</button>
      </div>`
    );

    this.mount();
  }

  createRenderRow = (
    value: { id: string; arrayItems: unknown },
    doCreateOnly?: boolean
  ) => {
    const arrayItem = createElementFromTemplate(
      createTemplate(
        `<div class="array-item _flex _flex-row table-row" data-array-id=${value.id}></div>`
      )
    );
    if (arrayItem && this.array) {
      arrayItem.remove();

      (this.props.formElements ?? []).forEach((formElement, index) => {
        const data = (value.arrayItems as any)[formElement.fieldName];

        const cell = createElementFromTemplate(
          createTemplate(
            `<div class="table-cell array-item__cell array-item__cell-${
              formElement.fieldType
            } p-0.5 ${index === 0 ? 'pl-0' : ''}"></div>`
          )
        );
        if (cell) {
          cell.remove();
          const element = this.props.createDataReadElement(formElement, data);
          cell.appendChild(element);
          //cell.textContent = data ?? '';
          arrayItem.appendChild(cell);
        }
      });

      const editCell = createElementFromTemplate(
        createTemplate(
          `<div class="table-cell array-item__cell array-item__cell ml-auto">
            <a href="#" class="array-item__edit"><span class="icon icon-createmode_editedit"></span></a>
            <a href="#" class="array-item__delete"><span class="icon icon-delete"></span></a>
          </div>`
        )
      );
      if (editCell) {
        editCell.remove();
        editCell.firstChild?.addEventListener('click', (event) => {
          event.preventDefault();
          const values = this.values.find((v) => v.id === value.id);
          console.log('edit', value, values?.arrayItems, this.values);
          if (values) {
            this.props
              .createFormDialog(this.props.formElements, values.arrayItems)
              .then((result) => {
                values.arrayItems = result;
                const updatedArrayRow = this.createRenderRow(values, true);
                if (updatedArrayRow) {
                  this.array
                    ?.querySelector(`[data-array-id="${value.id}"]`)
                    ?.replaceWith(updatedArrayRow);
                  this.render();
                  this.props.onChange?.(
                    this.values.map((value) => value.arrayItems)
                  );
                }
              });
          }
          return false;
        });
        editCell.lastChild?.addEventListener('click', (event) => {
          event.preventDefault();
          this.values = this.values.filter((v) => v.id !== value.id);

          this.render();
          this.array?.querySelector(`[data-array-id="${value.id}"]`)?.remove();
          this.props.onChange?.(this.values.map((value) => value.arrayItems));
          return false;
        });
        arrayItem.appendChild(editCell);
      }

      if (arrayItem && !doCreateOnly) {
        this.array.appendChild(arrayItem);
      }
      return arrayItem;
    }
    return false;
  };

  mount() {
    super.mount();

    if (this.isMounted) return;
    if (!this.template) return;
    if (!this.rootElement) return;
    if (!this.element) {
      this.renderList = [];
      this.element = createElementFromTemplate(this.template);
      if (this.element) {
        this.element.remove();
        this.label = this.element.firstChild as HTMLLabelElement;
        this.array = this.label.nextSibling as HTMLDivElement;
        this.addButton = this.array.nextSibling as HTMLInputElement;
        this.renderList.push(this.label, this.array, this.addButton);
        this.addButton.addEventListener('click', this.onAddButtonClick);

        this.values.forEach((value, _index) => {
          this.createRenderRow(value);
        });
        trackNamedSignal(
          `${this.props.formId}_${this.props.fieldName}`,
          (value) => {
            console.log(
              'trackNamedSignal',
              this.props.formId,
              this.props.fieldName,
              value
            );
          }
        );
      }
    }
    this.isMounted = true;
  }
  unmount() {
    super.unmount();
    if (this.element && this.element.remove) {
      // remove only removes the connection between parent and node
      this.element.remove();
    }
    this.isMounted = false;
  }

  onAddButtonClick = (_event: Event) => {
    this.props.createFormDialog(this.props.formElements, {}).then((result) => {
      const valueRow = { arrayItems: result, id: crypto.randomUUID() };
      this.values.push(valueRow);
      this.createRenderRow(valueRow);
      this.render();
      this.props.onChange?.(this.values.map((value) => value.arrayItems));
    });
  };
  render() {
    super.render();
    if (!this.element) return;
    if (!this.addButton) return;

    this.oldProps = this.props;

    if (this.initialRender) {
      this.initialRender = false;
      this.renderElements([this.label, this.array, this.addButton]);
    }
  }
}
