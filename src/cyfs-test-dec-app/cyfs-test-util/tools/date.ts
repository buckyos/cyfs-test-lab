var date = require("silly-datetime");

export function get_date(type:string="YYYY_MM_DD_HH_mm_ss"){
    return date.format(new Date(),type);
}
