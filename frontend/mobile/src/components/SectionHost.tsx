import { JSX } from "solid-js";

type ScreenButton = {
  label: string;
  value: number;
};

type SectionHostProps = {
  children: JSX.Element;
  buttons: ScreenButton[];
  active: number;
  onSelect: (value: number) => void;
};

export function SectionHost(props: SectionHostProps) {
  return (
    <div id="container">
      <section id="screen">{props.children}</section>
      <div class="section-controls">
        {props.buttons.map((button) => (
          <button
            type="button"
            class={"section-switch-button" + (props.active === button.value ? " active" : "")}
            onClick={() => props.onSelect(button.value)}
            aria-pressed={props.active === button.value ? "true" : "false"}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}
