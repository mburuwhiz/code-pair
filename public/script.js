document.getElementById("copy").onclick = () => {
  const code = document.getElementById("code").innerText;
  navigator.clipboard.writeText(code);
  const toast = document.getElementById("toast");
  toast.style.visibility = "visible";
  setTimeout(() => {
    toast.style.visibility = "hidden";
  }, 3000);
};
