// typewriter.ts

export function typewriter(node: HTMLElement, initialSpeed = 20): {
  update: (newSpeed: number) => void;
  destroy: () => void;
} {
  // Capture the original text from the node.
  const text = node.textContent || "";
  // Clear the node's content so we can type it out.
  node.textContent = "";

  let i = 0;
  let speed = initialSpeed;
  let timeoutId: ReturnType<typeof setTimeout>;

  function type() {
    if (i < text.length) {
      // Append the next character.
      node.textContent += text.charAt(i);
      i++;
      timeoutId = setTimeout(type, speed);
    }
  }

  type();

  return {
    update(newSpeed: number) {
      speed = newSpeed;
    },
    destroy() {
      clearTimeout(timeoutId);
    }
  };
}