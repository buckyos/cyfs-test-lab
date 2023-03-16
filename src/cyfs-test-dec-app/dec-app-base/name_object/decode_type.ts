import * as cyfs from "../../cyfs"



export enum TestDecoderType {
    People = "People",
}

export type TestPeople = {
    base_desc : {
        owner : string,
        area? : string,
        public_key : string,
    },
	desc:{

	},
	body:{
		ood_list : Array<string>,
        name? : string,
        icon? : string,
	}
}


export type TestPeopleReq = {
    type : TestDecoderType
    data : TestPeople
    buffer : Uint8Array
}

export type TestPeopleResp = {
    result : number,
    msd : string,
    data : TestPeople
    buffer : Uint8Array
}



