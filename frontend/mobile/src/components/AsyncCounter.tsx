import { createMemo, createSignal, isPending, latest, Loading } from "solid-js";
import "./AsyncCounter.css";

async function getCount() {
  await new Promise((res) => setTimeout(res, 1000));
  return 99;
}

async function getDoubleCount(count: number) {
  await new Promise((res) => setTimeout(res, 1000));
  return count * 2;
}

export function AsyncCounter() {
  console.log("AsyncCounter called");
  const [count, setCount] = createSignal(getCount);
  const doubleCount = createMemo(() => getDoubleCount(count()));
  return (
    <Loading fallback={<div>Loading...</div>}>
      <div class="app-container">
        <h2>Async Counter Demo</h2>
        <p>Pending: {isPending(doubleCount) ? "true" : "false"}</p>
        <Box></Box>
        <button class="accent-button" onClick={() => setCount((p) => p + 1)}>
          count is {latest(count)}
        </button>
        <button class="accent-button">Double Count is {doubleCount()}</button>
      </div>
    </Loading>
  );
}

function Box() {
  console.log("Box function called");
  return <div class="box">Box</div>;
}
