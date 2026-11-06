import { jsPDF } from 'jspdf'

const generatePaymentBill = (transaction) => {
  const bill = new jsPDF()
  const pageWidth = bill.internal.pageSize.getWidth()
  const amount = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(transaction.amount)

  bill.setFillColor(15, 23, 42)
  bill.rect(0, 0, pageWidth, 54, 'F')
  bill.setTextColor(255, 255, 255)
  bill.setFont('helvetica', 'bold')
  bill.setFontSize(22)
  bill.text('PAYMENT RECEIPT', pageWidth / 2, 28, { align: 'center' })
  bill.setFont('helvetica', 'normal')
  bill.setFontSize(11)
  bill.text('Project Payment', pageWidth / 2, 39, { align: 'center' })

  bill.setTextColor(15, 23, 42)
  bill.setFont('helvetica', 'bold')
  bill.setFontSize(12)
  bill.text('PAYMENT DETAILS', 20, 77)
  bill.setDrawColor(203, 213, 225)
  bill.line(20, 83, pageWidth - 20, 83)

  const details = [
    ['Payer name', transaction.payerName || '—'],
    ['Payment amount', `INR ${amount}`],
    ['Payment date', transaction.date || '—'],
    ['Payment method', transaction.method || '—'],
  ]
  details.forEach(([label, value], index) => {
    const y = 103 + index * 23
    bill.setFont('helvetica', 'normal')
    bill.setFontSize(11)
    bill.setTextColor(71, 85, 105)
    bill.text(label, 20, y)
    bill.setFont('helvetica', 'bold')
    bill.setTextColor(15, 23, 42)
    bill.text(String(value), pageWidth - 20, y, { align: 'right' })
    bill.setDrawColor(226, 232, 240)
    if (index < details.length - 1) bill.line(20, y + 8, pageWidth - 20, y + 8)
  })

  bill.setFont('helvetica', 'normal')
  bill.setFontSize(10)
  bill.setTextColor(100, 116, 139)
  bill.text('Thank you for your payment.', pageWidth / 2, 210, { align: 'center' })
  bill.save(`payment-receipt-${transaction.id}.pdf`)
}

export default generatePaymentBill
