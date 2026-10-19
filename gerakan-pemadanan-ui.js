const branchSelect = document.querySelector("#cabangFilter");
const branchField = document.querySelector(".branch-first-filter");
const branchHint = document.querySelector("#branchFirstHint");
let branchHintDismissed = false;

function updateBranchNotice() {
  const needsSelection = branchSelect.value === "NONE";
  branchField.classList.toggle("needs-selection", needsSelection);
  const hasData = branchSelect.options.length > 2;
  branchHint.hidden = !needsSelection || !hasData || branchHintDismissed;
}

document.querySelector("#dismissBranchHint").addEventListener("click", () => {
  branchHintDismissed = true;
  branchHint.hidden = true;
  branchSelect.focus();
});
branchSelect.addEventListener("change", updateBranchNotice);
branchSelect.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    branchHintDismissed = true;
    branchHint.hidden = true;
  }
});
new MutationObserver(updateBranchNotice).observe(branchSelect, { childList: true });
updateBranchNotice();
