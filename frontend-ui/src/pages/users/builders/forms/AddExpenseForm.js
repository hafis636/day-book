import AddPaymentForm from './AddPaymentForm'
import { validateExpense } from './validations/expenseValidation'

const AddExpenseForm = ({ projectId, expense, onClose }) => (
  <AddPaymentForm
    projectId={projectId}
    payment={expense}
    transactionType="expense"
    validateTransaction={validateExpense}
    onClose={onClose}
  />
)

export default AddExpenseForm
