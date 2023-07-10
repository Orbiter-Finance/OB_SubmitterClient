

// Use this type of Tx to accumulate the specific Entry Node Value
// Key
export interface EntryNodeTx {
    srcTxHash: string
    dstTxHash: string
    fee: string

}



export interface CrossTx {

    updateAddress: string

    srcTxHash: string
    srxTxTimeStamp: string
    srcChainId: string
    srcAmount: string
    srcFromAddress: string
    srcToAddress: string

    dstTxHash: string
    dstTxTimeStamp: string
    dstChainId: string
    dstAmount: string
    dstFromAddress: string
    dstToAddress: string

    fee: string
    repayTime: string
    bindDealerId: string
    bindDealerFee: string


    dealerAddress: string
    makerAddress: string

}


// Withdraw or Deposit
export interface FundsTx {
    updateAddress: string 
}

export interface EntryNodeTxBatch {
    txList: EntryNodeTx[]
}