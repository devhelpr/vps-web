// eslint-disable-next-line @typescript-eslint/no-unused-vars
//import { createJSXElement } from '@devhelpr/visual-programming-system';

function Add(a: number, b: number) {
  return a + b;
}

export const TestComponent = (props: any) => {
  console.log('TestComponent constructor');
  return (
    <div>
      Hello Test Component
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        click={(event: MouseEvent) => {
          console.log('click TestComponent');
          ///event.preventDefault();
          //event.stopPropagation();
          alert('Hello World!');
          return false;
        }}
      >
        Click Me
      </button>
      {2 + 3 * Add(1, 6)}
      {props.test}
    </div>
  );
};
