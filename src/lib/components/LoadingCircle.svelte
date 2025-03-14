<script>
  export let size = "24px";
  export let color = "#333";
</script>

<div class="loading-circle" style="--size: {size}; --color: {color}">
  <div class="circle">
    <div class="earth"></div>
    <div class="blob"></div>
  </div>
</div>

<style>
  .loading-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--size);
    height: var(--size);
  }

  .circle {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(0, 102, 204, 0.1);
    position: relative;
    overflow: hidden;
    box-shadow: inset 0 0 20px rgba(0, 102, 204, 0.2);
  }

  .earth {
    position: absolute;
    width: 200%;
    height: 200%;
    top: -50%;
    left: -50%;
    background: radial-gradient(circle at 30% 50%, 
      rgba(255, 255, 255, 0.8) 0%,
      rgba(120, 180, 255, 0.6) 30%,
      rgba(0, 102, 204, 0.4) 60%,
      transparent 100%
    );
    animation: rotate 2s linear infinite;
    transform-origin: 50% 50%;
    filter: blur(2px);
  }

  .blob {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 40% 50%, 
      rgba(255, 255, 255, 0.4) 0%,
      transparent 50%
    );
    animation: morph 4s ease-in-out infinite;
    border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
    transform-origin: 50% 50%;
  }

  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes morph {
    0% {
      border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
      transform: rotate(0deg);
    }
    50% {
      border-radius: 58% 42% 30% 70% / 55% 55% 45% 45%;
      transform: rotate(180deg);
    }
    100% {
      border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
      transform: rotate(360deg);
    }
  }
</style>