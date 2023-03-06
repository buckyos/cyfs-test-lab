export * as zip_case from "./zip_case"
export * as clean from "./clean"
export * as create_task from "./create_task"
export * as update_task from "./update_task"
export * as create_job from "./create_job"


export type CaseConfig = {
    rust_bdt:{
        name: string,
        version: string,
        distribute: number,
        runrule:number,
        serviceid: number,
        servicename: string,
        list:Array<{desc:string,taskid?:number}>
    }
}


export type JobConfig = {
    desc: string,
    serviceid: number,
    servicename: string,
    jobid? : number,
    tasks:Array<{desc:string,taskid?:number,timeslimit?:number}>

}