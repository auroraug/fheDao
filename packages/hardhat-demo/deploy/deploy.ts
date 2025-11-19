import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { merkleTreeExample } from "../utils/merkleTree-example";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedDAO = await deploy("DAO", {
    from: deployer,
    args: [merkleTreeExample.getMerkleRoot()],
    log: true,
  });

  console.log(`DAO contract: `, deployedDAO.address);
};
export default func;
func.id = "deploy_DAO"; // id required to prevent reexecution
func.tags = ["DAO"];
