document.addEventListener("DOMContentLoaded", () => {
  const codeElement = document.querySelector(".pairing-code");
  const statusText = document.getElementById("copy-status");

  // Wait for code to load from server-rendered DOM (placeholder replaced)
  if (codeElement.innerText.trim() !== "Generating...") {
    enableClickToCopy(codeElement.innerText);
  }

  function enableClickToCopy(code) {
    codeElement.style.cursor = "pointer";
    codeElement.addEventListener("click", () => {
      navigator.clipboard.writeText(code).then(() => {
        statusText.innerText = "✅ Copied!";
        setTimeout(() => {
          statusText.innerText = "Click the code to copy";
        }, 3000);
      });
    });
  }
});
