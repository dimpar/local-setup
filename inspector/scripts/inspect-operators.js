const truffleContract = require("@truffle/contract")
const clc = require("cli-color");

const KeepTokenJson = require("@keep-network/keep-core/artifacts/KeepToken.json")
const TokenStakingJson = require("@keep-network/keep-core/artifacts/TokenStaking.json")
const KeepBondingJson = require("@keep-network/keep-ecdsa/artifacts/KeepBonding.json")
const KeepRandomBeaconOperatorJson = require("@keep-network/keep-core/artifacts/KeepRandomBeaconOperator.json")
const BondedECDSAKeepFactoryJson = require("@keep-network/keep-ecdsa/artifacts/BondedECDSAKeepFactory.json")

const tokenDecimalMultiplier = web3.utils.toBN(10).pow(web3.utils.toBN(18))

module.exports = async function() {
  try {
    // beacon-nodes.json and ecdsa-nodes.json should contain information about
    // nodes available in the network in the format returned by /diagnostics
    // endpoint of keep client, preferably bootstrap node
    const beaconNodes = require("../input-data/beacon-nodes.json")
    const ecdsaNodes = require("../input-data/ecdsa-nodes.json")

    const KeepToken = truffleContract(KeepTokenJson)
    const TokenStaking = truffleContract(TokenStakingJson)
    const KeepBonding = truffleContract(KeepBondingJson)
    const KeepRandomBeaconOperator = truffleContract(KeepRandomBeaconOperatorJson)
    const BondedECDSAKeepFactory = truffleContract(BondedECDSAKeepFactoryJson)

    KeepToken.setProvider(web3.currentProvider)
    TokenStaking.setProvider(web3.currentProvider)
    KeepBonding.setProvider(web3.currentProvider)
    KeepRandomBeaconOperator.setProvider(web3.currentProvider)
    BondedECDSAKeepFactory.setProvider(web3.currentProvider)

    const keepToken = await KeepToken.deployed()
    const tokenStaking = await TokenStaking.deployed()
    const keepRandomBeaconOperator = await KeepRandomBeaconOperator.deployed()
    const bondedEcdsaKeepFactory = await BondedECDSAKeepFactory.deployed()
    const keepBonding = await KeepBonding.deployed()

    console.log(clc.yellow(`*** Contract Addresses ***`))
    console.log(`KeepToken:                ${keepToken.address}`)
    console.log(`TokenStaking:             ${tokenStaking.address}`)
    console.log(`KeepRandomBeaconOperator: ${keepRandomBeaconOperator.address}`)
    console.log(`BondedECDSAKeepFactory:   ${bondedEcdsaKeepFactory.address}`)
    console.log(`KeepBonding:              ${keepBonding.address}`)
    console.log(``)

    const beaconOperators = beaconNodes.connected_peers.map((peer) => peer.ethereum_address)
    console.log(clc.italic(`Fetching staking info for [${beaconOperators.length}] beacon operators...`))
    console.log(``)

    const beaconSummary = []

    for (let i = 0; i < beaconOperators.length; i++) {
        const operator = beaconOperators[i]

        const eligibleStake = await tokenStaking.eligibleStake(operator, keepRandomBeaconOperator.address)     
        const eligibleStakeKeep = eligibleStake.div(tokenDecimalMultiplier)

        const operatorBalance = await web3.eth.getBalance(operator)
        const operatorBalanceEth = web3.utils.fromWei(operatorBalance);

        beaconSummary.push({
            address: operator,
            eligibleStakeKeep: eligibleStakeKeep.toString(),
            operatorBalanceEth: operatorBalanceEth.toString()
        })
    }

    console.log(clc.yellow(`*** Beacon Operators ***`))
    console.table(beaconSummary)
    console.log(``)

    const ecdsaOperators = ecdsaNodes.connected_peers.map((peer) => peer.ethereum_address)
    console.log(clc.italic(`Fetching staking info for [${ecdsaOperators.length}] ECDSA operators...`))
    console.log(``)

    const ecdsaSummary = []
    for (let i = 0; i < ecdsaOperators.length; i++) {
        const operator = ecdsaOperators[i]

        const eligibleStake = await tokenStaking.eligibleStake(operator, keepRandomBeaconOperator.address)     
        const eligibleStakeKeep = eligibleStake.div(tokenDecimalMultiplier)

        const operatorBalance = await web3.eth.getBalance(operator)
        const operatorBalanceEth = web3.utils.fromWei(operatorBalance)

        const unbondedValue = await keepBonding.unbondedValue(operator)
        const unbondedValueEth = web3.utils.fromWei(unbondedValue)

        ecdsaSummary.push({
            address: operator,
            eligibleStakeKeep: eligibleStakeKeep.toString(),
            operatorBalanceEth: operatorBalanceEth.toString(),
            unbondedValueEth: unbondedValueEth
        })
    }

    console.log(clc.yellow(`*** ECDSA Operators ***`))
    console.table(ecdsaSummary)

    process.exit(0)
  } catch (error) {
    console.log(`ERROR: ${error}`)
    process.exit(1)
  }
}
