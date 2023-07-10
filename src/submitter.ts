

import { JSONRPCServer } from "json-rpc-2.0"

import RLP from "rlp"

import bodyParser from "body-parser"

import { EntryNodeTxBatch } from "./types"

import express from "express"

export type HashFunction = (childNodes: string[]) => string;

export class SMTEntryNode {

  private hash: HashFunction
  private address: string
  private chainId: string
  private tokenAddress: string
  private tokenAmount: string

  private dealerId: string
  private profitRate: string
  private makerAddress: string
  private dealerAddress: string

  private txBatch: EntryNodeTxBatch


  constructor(
    hash: HashFunction,
    address:string, 
    chainId: string, 
    tokenAddress: string, 
    tokenAmount: string,
    dealerId: string,
    profitRate: string,
    makerAddress: string,
    dealerAddress: string,
    txBatch: EntryNodeTxBatch
  ) {
    this.hash = hash
    this.address = address
    this.chainId = chainId
    this.tokenAddress = tokenAddress
    this.tokenAmount = tokenAmount
    this.dealerId = dealerId
    this.profitRate = profitRate
    this.makerAddress = makerAddress
    this.dealerAddress = dealerAddress
    this.txBatch = txBatch
  }

  public getKey() {
    return this.hash([this.address, this.chainId, this.tokenAddress])
  }

  public getValue() {
    
  }
}


export class Submitter {

}

const server = new JSONRPCServer()

server.addMethod("echo", ({ text }) => text);
server.addMethod("log", ({ message }) => console.log(message));

const app = express();
app.use(bodyParser.json());

app.post("/json-rpc", (req, res) => {
  const jsonRPCRequest = req.body;
  // server.receive takes a JSON-RPC request and returns a promise of a JSON-RPC response.
  // It can also receive an array of requests, in which case it may return an array of responses.
  // Alternatively, you can use server.receiveJSON, which takes JSON string as is (in this case req.body).
  server.receive(jsonRPCRequest).then((jsonRPCResponse) => {
    if (jsonRPCResponse) {
      res.json(jsonRPCResponse);
    } else {
      // If response is absent, it was a JSON-RPC notification method.
      // Respond with no content status (204).
      res.sendStatus(204);
    }
  });
});
app.listen(80);