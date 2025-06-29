// Simple validator to test Aiken compilation
use cardano/transaction.{Transaction, OutputReference}

validator simple {
  spend(datum: Option<Data>, redeemer: Data, utxo: OutputReference, self: Transaction) {
    True
  }
}
