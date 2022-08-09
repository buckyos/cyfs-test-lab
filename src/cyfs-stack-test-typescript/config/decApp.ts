
import * as cyfs from "../cyfs_node/cyfs_node"
export const NIGHTLY_DEC_ID = "9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT2ze";
export const NIGHTLY_SERVICE_OOD = "5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP";

export const BETA_DEC_ID = "9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT2ze";
export const BETA_SERVICE_OOD = "5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP";

export const  APP_NAME = "cyfs_stack_test"
export const TEST_DEC_ID = cyfs.ObjectId.from_base_58(BETA_DEC_ID).unwrap();
export const SERVICE_OOD = BETA_SERVICE_OOD;
export const DEC_ID_BASE58 = BETA_DEC_ID