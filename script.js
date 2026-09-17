document.getElementById('year').textContent = new Date().getFullYear();
document.querySelectorAll('details').forEach(detail => {
  detail.addEventListener('toggle', () => {
    const symbol = detail.querySelector('summary span');
    if (symbol) symbol.setAttribute('aria-hidden', 'true');
  });
});
