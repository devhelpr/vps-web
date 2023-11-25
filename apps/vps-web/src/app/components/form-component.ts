// import { InputField } from './form-fields/input';
// import { SelectField } from './form-fields/select';
// import { TextAreaField } from './form-fields/textarea';

import {
  BaseComponent,
  Component,
  createElementFromTemplate,
  createTemplate,
} from '@devhelpr/dom-components';
import { InputFieldChildComponent } from './form-fields/input';
import { TextAreaFieldComponent } from './form-fields/textarea';
import { SliderFieldChildComponent } from './form-fields/slider';
import { ColorFieldChildComponent } from './form-fields/color';
import { ButtonFieldChildComponent } from './form-fields/button';
import { FormFieldComponent } from './form-fields/field';

export const FormFieldType = {
  Text: 'Text',
  TextArea: 'TextArea',
  Select: 'Select',
  Slider: 'Slider',
  Color: 'Color',
  Button: 'Button',
} as const;

export type FormFieldType = (typeof FormFieldType)[keyof typeof FormFieldType];

export type FormField = (
  | {
      fieldType: 'Select';
      options: { value: string; label: string }[];
    }
  | {
      fieldType: 'Text';
    }
  | {
      fieldType: 'Button';
      caption: string;
      onButtonClick?: () => Promise<void> | void;
    }
  | {
      fieldType: 'TextArea';
    }
  | {
      fieldType: 'Slider';
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      fieldType: 'Color';
    }
) & {
  fieldName: string;
  label?: string;
  setValue: (fieldName: string, value: string) => void;
  value: string;
  isRow?: boolean;
  onChange?: (value: string) => void;
  settings?: {
    showLabel?: boolean;
  };
};

export interface FormComponentProps {
  rootElement: HTMLElement;
  onSave: (values: any) => void;
  formElements: FormField[];
  hasSubmitButton?: boolean;
  id: string;
}

type FormValues = {
  [key: string]: string;
};

export interface Props {
  rootElement: HTMLElement;
  onSave: (values: any) => void;
  formElements: FormField[];
  hasSubmitButton?: boolean;
  id: string;
}

export class FormsComponent extends Component<Props> {
  oldProps: Props | null = null;
  values: FormValues = {};
  previousDoRenderChildren: boolean | null = null;
  doRenderChildren: boolean | null = true;

  div: HTMLDivElement | null = null;
  form: HTMLFormElement | null = null;
  buttonElement: HTMLElement | null = null;

  constructor(parent: BaseComponent | null, props: Props) {
    super(parent, props);

    // WARNING ! Don't make the parents positioned relative or absolute... this will break the positioning of the thumbs when connected to form elements!!!
    // offsetTop is used.. and that is relative to the first positioned parent.. which is the node, not the form...
    this.template = createTemplate(
      `<div class="w-full p-2">
        <form>
          <children></children>
          ${
            props.hasSubmitButton === true
              ? ` <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mt-4 rounded">Save</button>`
              : ''
          }
        </form>
      </div>`
    );
    this.rootElement = props.rootElement;
    this.mount();
  }
  mount() {
    super.mount();
    if (this.isMounted) return;
    if (!this.template) return;
    if (!this.rootElement) return;
    if (!this.element) {
      this.element = createElementFromTemplate(this.template);

      if (this.element) {
        this.element.remove();
        this.div = this.element as HTMLDivElement;
        this.form = this.div.firstChild as HTMLFormElement;
        this.form.setAttribute('id', this.props.id);
        this.childContainerElement = this.form;
        // this.renderList.push(
        // );
        this.childRoot = this.form.firstChild as HTMLElement;
        if (this.props.hasSubmitButton === true) {
          this.buttonElement = this.form.lastChild as HTMLElement;
        }
        this.renderList.push(this.childRoot);
        if (this.buttonElement) {
          this.renderList.push(this.buttonElement);
        }
        this.createFormElements();
        this.rootElement.append(this.element);
        this.form.addEventListener('submit', this.onSubmit);
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

  onSubmit = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    const form = event.target as HTMLFormElement;
    const values = Object.fromEntries(new FormData(form));
    console.log(values);
    this.props.onSave({ ...values });
    return false;
  };

  onChange = (item: FormField, value: string) => {
    item.value = value;
    this.values[item.fieldName] = value;
    if (item.onChange) {
      item.onChange(value);
    }
  };

  setValue = (fieldName: string, value: string) => {
    const formElement = this.components.find(
      (component) =>
        (component as FormFieldComponent<any>).fieldName === fieldName
    );
    if (formElement) {
      (formElement as FormFieldComponent<any>).setValue(value);
    }
  };

  createFormElements() {
    this.components = [];
    let loop = 0;
    this.props.formElements.forEach((formControl, index) => {
      if (formControl.fieldType === FormFieldType.Text) {
        const formControlComponent = new InputFieldChildComponent(this, {
          formId: this.props.id,
          fieldName: formControl.fieldName,
          label: formControl.label,
          value: formControl.value,
          isRow: formControl.isRow,
          settings: formControl.settings,
          setValue: this.setValue,
          onChange: (value) => this.onChange(formControl, value),
          isLast: index === this.props.formElements.length - 1,
        });
        this.components.push(formControlComponent);
      } else if (formControl.fieldType === FormFieldType.Slider) {
        const formControlComponent = new SliderFieldChildComponent(this, {
          formId: this.props.id,
          fieldName: formControl.fieldName,
          label: formControl.label,
          value: formControl.value,
          isRow: formControl.isRow,
          min: formControl.min,
          max: formControl.max,
          step: formControl.step,
          settings: formControl.settings,
          setValue: this.setValue,
          onChange: (value) => this.onChange(formControl, value),
          isLast: index === this.props.formElements.length - 1,
        });
        this.components.push(formControlComponent);
      } else if (formControl.fieldType === FormFieldType.Color) {
        const formControlComponent = new ColorFieldChildComponent(this, {
          formId: this.props.id,
          fieldName: formControl.fieldName,
          label: formControl.label,
          value: formControl.value,
          isRow: formControl.isRow,
          settings: formControl.settings,
          setValue: this.setValue,
          onChange: (value) => this.onChange(formControl, value),
          isLast: index === this.props.formElements.length - 1,
        });
        this.components.push(formControlComponent);
      } else if (formControl.fieldType === FormFieldType.TextArea) {
        const formControlComponent = new TextAreaFieldComponent(this, {
          formId: this.props.id,
          fieldName: formControl.fieldName,
          label: formControl.label,
          value: formControl.value,
          setValue: this.setValue,
          onChange: (value) => this.onChange(formControl, value),
          isLast: index === this.props.formElements.length - 1,
        });
        this.components.push(formControlComponent);
      } else if (formControl.fieldType === FormFieldType.Button) {
        const formControlComponent = new ButtonFieldChildComponent(this, {
          formId: this.props.id,
          fieldName: formControl.fieldName,
          caption: formControl.caption,
          setValue: this.setValue,
          onButtonClick: formControl.onButtonClick,
          isLast: index === this.props.formElements.length - 1,
        });
        this.components.push(formControlComponent);
      }
      loop++;
      //listItemComponent.props.listItem = "updated via props";
    });
  }

  render() {
    super.render();

    if (!this.element) return;

    if (
      !this.oldProps ||
      this.oldProps.formElements.length !== this.props.formElements.length
    ) {
      console.log('list items changed');
      this.createFormElements();
      this.previousDoRenderChildren = null;
    }
    this.oldProps = {
      ...this.props,
      formElements: [...this.props.formElements],
    };

    // Make this smarter .. do only when needed!!?
    // an approach: only perform when doRenderChildren changes or has its initial value set
    // .. however.. the children's render method isn't called when no change is detected.. but is this a problem?
    // ... the children themselves should be responsible for this
    if (
      this.previousDoRenderChildren === null ||
      this.previousDoRenderChildren !== this.doRenderChildren
    ) {
      this.previousDoRenderChildren = this.doRenderChildren;
      this.renderList = [];
      const childElements = this.doRenderChildren
        ? this.getRenderableChildren()
        : [];
      if (this.buttonElement) {
        childElements.push(this.buttonElement);
      }
      this.renderElements(childElements);
    }
  }
}

export const FormComponent = (props: FormComponentProps) => {
  new FormsComponent(null, {
    rootElement: props.rootElement,
    onSave: props.onSave,
    formElements: props.formElements,
    hasSubmitButton: props.hasSubmitButton,
    id: props.id,
  }).render();
  // const values: FormValues = {};
  // const onChange = (item: FormField, value: string) => {
  //   item.value = value;
  //   values[item.fieldName] = value;
  //   if (item.onChange) {
  //     item.onChange(value);
  //   }
  // };
  // return (
  //   <div class="w-full p-2">
  //     <form
  //       onsubmit={(event: SubmitEvent) => {
  //         event.preventDefault();
  //         event.stopPropagation();
  //         const form = event.target as HTMLFormElement;
  //         const values = Object.fromEntries(new FormData(form));
  //         console.log(values);
  //         props.onSave({ ...values });
  //         return false;
  //       }}
  //     >
  //       <list:Render list={props.formElements}>
  //         {(item: FormField) => (
  //           <div class="w-full mb-2">
  //             <label for={item.fieldName} class="block mb-2">
  //               {item.fieldName}
  //             </label>
  //             <if:Condition test={item.fieldType === FormFieldType.Text}>
  //               <div>
  //                 <InputField
  //                   formId={props.id}
  //                   fieldName={item.fieldName}
  //                   value={item.value}
  //                   onChange={(value) => onChange(item, value)}
  //                 ></InputField>
  //               </div>
  //             </if:Condition>
  //             <if:Condition test={item.fieldType === FormFieldType.TextArea}>
  //               <div>
  //                 <TextAreaField
  //                   fieldName={item.fieldName}
  //                   value={item.value}
  //                   onChange={(value) => onChange(item, value)}
  //                 ></TextAreaField>
  //               </div>
  //             </if:Condition>
  //             <if:Condition test={item.fieldType === FormFieldType.Select}>
  //               <div>
  //                 <SelectField
  //                   formId={props.id}
  //                   fieldName={item.fieldName}
  //                   value={item.value}
  //                   options={item.fieldType === 'Select' ? item.options : []}
  //                   onChange={(value) => onChange(item, value)}
  //                 ></SelectField>
  //               </div>
  //             </if:Condition>
  //           </div>
  //         )}
  //       </list:Render>
  //       <if:Condition
  //         test={
  //           props.hasSubmitButton === undefined ||
  //           props.hasSubmitButton === true
  //         }
  //       >
  //         <button
  //           type="submit"
  //           class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
  //         >
  //           Save
  //         </button>
  //       </if:Condition>
  //     </form>
  //   </div>
  //);
};
