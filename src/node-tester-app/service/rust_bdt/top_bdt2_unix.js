
const tableParser = require("table-parser");
const cp = require('child_process');
//const utils = require("./ut");


var numExtRgx = /([0-9\.]*)(\D?)/;
// Returns the megabyte version of a number with unit like:
// 218M returns 218
// 16G returns 16000
// 123K or 123 returns 0.123
function numInMega(numStr){
	var m = numStr.match(numExtRgx);
	
	if (m != null){
		let v = parseFloat(m[1]);
		let unit = m[2].toUpperCase();

		if (unit.startsWith("G")){
			v *= 1000;
		}else if (unit.startsWith("K") || unit.length === 0){
			v /= 1000;
		}
		return v;
	}
	return null;
}


// Simple Promise wrapper on top of 
function exec(cmd, ignoreError){
	var p = new Promise(function(resolve, reject){
		cp.exec(cmd,{maxBuffer: 1024 * 500},  (error, stdout, stderr) => {
			if (error && !ignoreError) {
				console.log(error);
				reject({stdout, stderr, error});	
			}else{

				resolve({stdout, stderr, error});	
			}
		});		
	});
	return p;
}

class BaseTop{

	run(){
		var self = this;
		return exec(self.cmd).then(function(data){
			self.extractTextData(data.stdout.toString());
		});		
	}

	extractTextData(content){
		var self = this;
		
		var tableHeadRgx = /\n\s*PID/i;
		var tableHeadIdx = content.match(tableHeadRgx).index;

		self.head = content.substring(0, tableHeadIdx);
		self.content = content.substring(tableHeadIdx);			
	}

	stats(){
		var head = this.head;

		var stats = {
			mem: {},
			cpu: {}
		};

		// get the cpu info
		var cpuMatch = head.match(this.cpuRgx);
		if (cpuMatch){
			stats.cpu.user = parseFloat(cpuMatch[1]);
			stats.cpu.sys = parseFloat(cpuMatch[2]);
			stats.cpu.idle = parseFloat(cpuMatch[3]);		
		}	

		var memMatch = head.match(this.memRgx);
		if (memMatch){
			let i = 1;
			for (let memName of this.memMatchNames){
				stats.mem[memName] = numInMega(memMatch[i]);
				i++;
			}
		}
		return stats;		
	}

	procs(){
		var tableData = tableParser.parse(this.content);
		var dataCfg = this.dataCfg;
		
		var procs = tableData.map(function(topItem){
			var item = {};


			for (let name in dataCfg){
				let cfg = dataCfg[name];
				let colName = (typeof cfg === "string")?cfg:cfg.colName;
				let colVal = topItem[colName][0];
				item[name] = (cfg.fn)?cfg.fn(colVal):colVal;
			}

			return item;
		});

		return procs;		
	}
}


class OsxTop extends BaseTop{

	constructor(){
		super();
		this.cmd = "top -l 2";
		this.cpuRgx = /\nCPU usage:.*?([0-9\.]*)% user.*?([0-9\.]*)% sys.*?([0-9\.]*)% idle/i;
		
		this.memRgx = /\nPhysMem:.*?([0-9]*.) used.*?([0-9]*.) wired.*?([0-9]*.) unused/i;
		this.memMatchNames = ["used", "wired", "unused"];

		this.dataCfg = {
			name: "COMMAND",
			pid: "PID", 
			cpu: {
				colName: "%CPU", 
				fn: parseFloat
			}, 
			mem: {
				colName: "MEM", 
				fn: numInMega
			}
		};
	}

	// need to override extract on osx because, we need to take the second page (-l 2, as the first page will have cpu 0.0)
	extractTextData(content){
		// get the second page context (the first page do not have the cpu)
		var pageIdx = content.indexOf("\nProcesses:", 100) + 1;
		content = content.substring(pageIdx);

		super.extractTextData(content);		
	}
}

class LnxTop extends BaseTop{

	constructor(){
        // top -d 3 -p `pidof node| sed 's/ /,/g'`
		super();
        this.cmd = "top -b -n 2 -p `pidof bdt2_unix| sed 's/ /,/g'`"; 
		this.cpuRgx = /\nCpu.*?([0-9\.]*)%us.*?([0-9\.]*)%sy.*?([0-9\.]*)%id/i;
		
		this.memRgx = /\nMem:.*?([0-9]*.) used.*?([0-9]*.) free.*?([0-9]*.) buffers/i;
		this.memMatchNames = ["used", "unused", "buffers"];

		this.dataCfg = {
			name: "COMMAND",
			pid: "PID", 

			cpu: {
				colName: "%CPU",
				fn: parseFloat
			}, 
			mem: {
				colName: "RES",
				fn: numInMega
			}
		};
	}

	// need to override extract on osx because, we need to take the second page (-l 2, as the first page will have cpu 0.0)
	extractTextData(content){
		// get the second page context (the first page do not have the cpu)
		var pageIdx = content.indexOf("top -", 100) + 1;
		content = content.substring(pageIdx);

		super.extractTextData(content);		
	}	
}

function fetch(){
    var platformTops = {
        "darwin": OsxTop,
        "linux": LnxTop
    };

	return new Promise(function(resolve, fail){
		var Top = platformTops[process.platform];
		if (Top == null){
			fail("Platform " + process.platform + " not supported yet");
			return;
		}

		var top = new Top();
		top.run().then(function(){
			resolve({procs: top.procs()});
		}).catch(function(ex){
			fail(ex);
		});
	});
}


module.exports = {
	fetch
};

// fetch().then(function(data){
//     // data as below
//     console.info(data)
// }); 



