import { PrismaClient,nft_info} from '@prisma/client'
import {prisma} from "../"
var date = require("silly-datetime");
export interface RecordNFT{
    name:string,
    author_id:string,
    owner_id:string,
    nft_id:string,
    status:string,
    cyfs_link:string,
    nft_link:string,
    create_time?:number,
    testcase_date?:string,
    data?:string,
}

export class NftInfo{
    static async  recordNft(record:RecordNFT){
        const result = await prisma.nft_info.create({data:{
            name:record.name,
            author_id:record.author_id,
            owner_id:record.owner_id,
            nft_id:record.nft_id,
            status:record.status,
            cyfs_link:record.cyfs_link,
            nft_link:record.nft_link,
            create_time:record.create_time,
            testcase_date: date.format(new Date(),'YYYY/MM/DD'),
            data:record.data,
        }})
        return result;
    }
    static async  querySelling(author_id:string,status:string):Promise<{nft_info:Array<nft_info>}> {
        console.info(`run SQL:  select * from nft_info where status = ${status} and author_id != ${author_id} order by create_time limit 1`)
        let result:Array<nft_info> = await prisma.$queryRaw`select * from nft_info where status = ${status} and author_id != ${author_id} order by create_time limit 1`
        console.info(`querySelling: ${result.length} ${result}`)
        return {nft_info:result}
        
    }
    static async  buyNft(nft_id:string,owner_id:string,status:string){
        let result:any =  await prisma.nft_info.updateMany({
            data:{
                owner_id,
                status
            },
            where:{
                nft_id:nft_id
            }
        })
        return result
    }
    static async report(testcase_date:string){
        let result_all:any =  await prisma.nft_info.count({
            where:{
                testcase_date:testcase_date,
            }
        })
        let result_buy:any =  await prisma.nft_info.count({
            where:{
                testcase_date:testcase_date,
                status:"buy",
            }
        })
        let result_selling:any =  await prisma.nft_info.count({
            where:{
                testcase_date:testcase_date,
                status:"Selling",
            }
        })
        let result_bid:any =  await prisma.nft_info.count({
            where:{
                testcase_date:testcase_date,
                status:"bid",
            }
        })
        let result_repeat:any =  await prisma.nft_info.count({
            where:{
                testcase_date:testcase_date,
                status:"repeat",
            }
        })
        let result_apply:any =  await prisma.nft_info.count({
            where:{
                testcase_date:testcase_date,
                status:"apply",
            }
        })
        let result_failed:any =  await prisma.nft_info.count({
            where:{
                testcase_date:testcase_date,
                status:"faild",
            }
        })
        return {
            result_all,result_buy,result_selling,result_bid,result_repeat,result_apply,result_failed
        }
    }

}

// async function main() {
//     let date = new Date(Date.now()- 0*24*60*60*1000).toLocaleDateString()
//     let result = await NftInfo.querySelling("5r4MYfFa5jHM522K5ML7FVNH1KjvESmKiBPDinXCKhug","buy");
//     console.info(result);
// }
// main() 