import styles from './App.module.css'
import { Calculator } from './features/calculator/components/Calculator/Calculator'

export default function App() {
  return (
    <main className={styles.app}>
      <h1 className="visually-hidden">Calculator</h1>
      <Calculator />
    </main>
  )
}
