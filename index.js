const express = require('express')
const Web3 = require('web3')
const web3 = new Web3()
const bitcoin = require('./lib/0xbitcoin-interface')

var app = express()

app.listen(8080, async() => {
	console.log('Started Test Service on port 8080')
	// initialize 0xbitcoin interface
    await bitcoin.init()
})

app.use(express.json())
app.set('json spaces', 2)
app.use(function(err, req, res, next) {
  console.error(err.stack)
  res.status(500).send(err.stack)
})

// wrap catches for asyn calls
const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
}

// 0xBitcoin's max target
let MAX_TARGET = web3.utils.toBN( 2 ).pow( web3.utils.toBN( 234 ) )

// the minimum Proof of work difficulty required to secure this service
let SERVICE_MINIMUM_DIFFICULTY = 65536

// set to keep track of submitted solutions
// TODO persist this with a db
const submittedSolutions = new Set();

// an arbitrary REST service method that is secured by 0xBitcoin proof of work
// curl -d '{ "nonce":"0xdeadbeef", "origin": "0xaddress"}' -H "Content-Type: application/json" http://127.0.0.1:8080/example2/execute
app.post('/example2/execute', asyncMiddleware( async (request, response, next) => {

	// make sure repeated solutions are not submitted
	if(submittedSolutions.has(request.body.nonce)){
		throw 'Solution has already been submitted'
	}
	submittedSolutions.add(request.body.nonce)

	var challenge = await bitcoin.getChallengeNumber(contractAddress)

	// validate the nonce against this service's minimum difficulty requirement
	if(!validate(challenge, request.body.origin, request.body.nonce, SERVICE_MINIMUM_DIFFICULTY) ) {
		throw 'Could not validate Proof of Work nonce against minimum service difficulty of ' + SERVICE_MINIMUM_DIFFICULTY
	}

	// merge with 0xbitcoin
	let bitcoinMerge = await bitcoin.validate(request.body.origin, request.body.nonce)
	if (bitcoinMerge === true){
		console.log('0xBitcoin solution found!!')
		// TODO submit valid nonce to a pool or directly here
		console.log('Submitting to 0xbitcoin or Pool for reward')

		// TODO use the service payload to perform service specific logic here
		let payload = request.body.payload
		console.log('payload is being processed here, secured by 0xbitcoins PoW')
	}

}))

// an arbitrary REST service method that is secured by 0xBitcoin proof of work
// curl -d '{ "nonce":"0xdeadbeef", "origin": "0xaddress", "payload": "{ }"}' -H "Content-Type: application/json" http://127.0.0.1:8080/example1/execute
app.post('/example1/execute', asyncMiddleware( async (request, response, next) => {

	// make sure repeated solutions are not submitted
	if(submittedSolutions.has(request.body.nonce)){
		throw 'Solution has already been submitted'
	}
	submittedSolutions.add(request.body.nonce)

	// merge with 0xbitcoin
	let bitcoinMerge = await bitcoin.validate(request.body.origin, request.body.nonce)
	if (bitcoinMerge === true){
		console.log('0xBitcoin solution found!!')
		// TODO submit valid nonce to a pool or directly here
		console.log('Submitting to 0xbitcoin or Pool for reward')

		// TODO use the service payload to perform service specific logic here
		let payload = request.body.payload
		console.log('payload is being processed here, secured by 0xbitcoins PoW')

	} else {
		throw 'Could not validate Proof of Work nonce aginst 0xBitcoin'
	}

}))

// validate the nonce
async function validate(challenge, publicKey, nonce, difficulty) {
	var digest = web3.utils.soliditySha3( challenge, publicKey, nonce )
    var digestBigNumber = web3.utils.toBN(digest)
    var target = await bitcoin.targetFromDifficulty(difficulty)
    if( digestBigNumber.lt(target) ) {
    	return true
    }
    return false
}


