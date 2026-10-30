export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }
  const showPaise = amount % 1 !== 0;
  try {
    return '₹' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: showPaise ? 2 : 0,
      maximumFractionDigits: 2,
    });
  } catch (e) {
    const x = Math.round(Number(amount)).toString();
    const lastThree = x.substring(x.length - 3);
    const otherNumbers = x.substring(0, x.length - 3);
    if (otherNumbers !== '') {
      return '₹' + (otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + ',' + lastThree);
    }
    return '₹' + lastThree;
  }
}
