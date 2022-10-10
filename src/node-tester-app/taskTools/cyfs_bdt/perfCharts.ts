

//import * as echarts from "echarts"
let node_echarts = require('node-echarts-canvas');

var date = require("silly-datetime");
export function bdteEchartsNetwork(filePath:string,agent:string,timeList:Array<number>,received:Array<number>,transmitted:Array<number>,maxNum:number){
    if(maxNum<100){
        maxNum = 100;
    }else{
        maxNum = Number(((maxNum * 1.2)/10).toFixed(0))*10
    }

    let interval = Number((timeList.length/20).toFixed(0));
    let option = {
        backgroundColor: '#FFFFF5',
        title: {
          text: 'BDT 节点网络监控',
          subtext: `${agent} 节点数据统计 `,
          x: 'center'
        },
    
        legend: {
          // orient 设置布局方式，默认水平布局，可选值：'horizontal'（水平） ¦ 'vertical'（垂直）
          orient: 'horizontal',
          // x 设置水平安放位置，默认全图居中，可选值：'center' ¦ 'left' ¦ 'right' ¦ {number}（x坐标，单位px）
          x: 'left',
          // y 设置垂直安放位置，默认全图顶端，可选值：'top' ¦ 'bottom' ¦ 'center' ¦ {number}（y坐标，单位px）
          y: 'top',
          data: ['下行速度','上行速度']
        },
    
        //  图表距边框的距离,可选值：'百分比'¦ {number}（单位px）
        grid: {
            top: '16%',   // 等价于 y: '16%'
            left: '3%', 
            right: '8%',
            bottom: '3%',
            containLabel: true
        },
    
        xAxis: {
          name: '时间戳',
          type: 'category',
          axisLine: {
            lineStyle: {
              // 设置x轴颜色
              color: '#000000'
            }
          },
          // 设置X轴数据旋转倾斜
          axisLabel: {
            rotate: 30, // 旋转角度
            interval: interval  //设置X轴数据间隔几个显示一个，为0表示都显示d
            },
          // boundaryGap值为false的时候，折线第一个点在y轴上
          boundaryGap: false,
          data: timeList
        },
    
        yAxis: {
          name: '传输速度Bytes/s',
          type: 'value',
          min:0, // 设置y轴刻度的最小值
          max:maxNum,  // 设置y轴刻度的最大值
          splitNumber:9,  // 设置y轴刻度间隔个数
          axisLine: {
            lineStyle: {
              // 设置y轴颜色
              color: '#000000'
            }
          },
        },
    
        series: [
          {
            name: '下行速度',
            data: received,
            type: 'line',
            // 设置折线上圆点大小
            symbolSize:1,
            itemStyle:{
              normal:{
                // 拐点上显示数值
                label : {
                show: false
                },
                borderColor:'red',  // 拐点边框颜色
                lineStyle:{                 
                  width:1,  // 设置线宽
                  type:'solid'  //'dotted'虚线 'solid'实线
                }
              }
            }
          },
          {
            name: '上行速度',
            data: transmitted,
            type: 'line',
            // 设置折线上圆点大小
            symbolSize:1,
            itemStyle:{
              normal:{
                // 拐点上显示数值
                label : {
                show: false
                },
                borderColor:'red',  // 拐点边框颜色
                lineStyle:{                 
                  width:1,  // 设置线宽
                  type:'solid'  //'dotted'虚线 'solid'实线
                }
              }
            }
          },
        ],
        
        color: ['#00EE00', '#FF9F7F']
      };
    node_echarts({
      width: 2000, // Image width, type is number.
      height: 500, // Image height, type is number.
      option: option, // Echarts configuration, type is Object.
      //If the path  is not set, return the Buffer of image.
      path: filePath, // Path is filepath of the image which will be created.
      enableAutoDispose: true //Enable auto-dispose echarts after the image is created.
    })
}
export function bdteEchartsCPU(filePath:string,agent:string,timeList:Array<number>,cpu:Array<number>,maxNum:number){
    if(maxNum<100){
        maxNum = 100;
    }else{
        maxNum = Number(((maxNum * 1.2)/10).toFixed(0))*10
    }
    let interval = Number((timeList.length/20).toFixed(0));
    let option = {
        backgroundColor: '#FFFFF5',
        title: {
          text: 'BDT 节点CPU使用率监控',
          subtext: `${agent} 节点数据统计 `,
          x: 'center'
        },
    
        legend: {
          // orient 设置布局方式，默认水平布局，可选值：'horizontal'（水平） ¦ 'vertical'（垂直）
          orient: 'horizontal',
          // x 设置水平安放位置，默认全图居中，可选值：'center' ¦ 'left' ¦ 'right' ¦ {number}（x坐标，单位px）
          x: 'left',
          // y 设置垂直安放位置，默认全图顶端，可选值：'top' ¦ 'bottom' ¦ 'center' ¦ {number}（y坐标，单位px）
          y: 'top',
          data: ['CPU']
        },
    
        //  图表距边框的距离,可选值：'百分比'¦ {number}（单位px）
        grid: {
            top: '16%',   // 等价于 y: '16%'
            left: '3%', 
            right: '8%',
            bottom: '3%',
            containLabel: true
        },
    
        xAxis: {
          name: '时间',
          type: 'category',
          axisLine: {
            lineStyle: {
              // 设置x轴颜色
              color: '#000000'
            }
          },
          // 设置X轴数据旋转倾斜
          axisLabel: {
            rotate: 30, // 旋转角度
            interval  //设置X轴数据间隔几个显示一个，为0表示都显示d
            },
          // boundaryGap值为false的时候，折线第一个点在y轴上
          boundaryGap: false,
          data: timeList
        },
    
        yAxis: {
          name: 'CPU(百分比)',
          type: 'value',
          min:0, // 设置y轴刻度的最小值
          max:maxNum,  // 设置y轴刻度的最大值
          splitNumber:9,  // 设置y轴刻度间隔个数
          axisLine: {
            lineStyle: {
              // 设置y轴颜色
              color: '#000000'
            }
          },
        }, 
        series: [
            {
              name: 'CPU',
              data: cpu,
              type: 'line',
              // 设置折线上圆点大小
              symbolSize:1,
              itemStyle:{
                normal:{
                  // 拐点上显示数值
                  label : {
                  show: false
                  },
                  borderColor:'red',  // 拐点边框颜色
                  lineStyle:{                 
                    width:1,  // 设置线宽
                    type:'solid'  //'dotted'虚线 'solid'实线
                  }
                }
              }
            },
          ],       
        color: ['#00EE00']
      };
    node_echarts({
      width: 2000, // Image width, type is number.
      height: 500, // Image height, type is number.
      option: option, // Echarts configuration, type is Object.
      path: filePath, // Path is filepath of the image which will be created.
      enableAutoDispose: true //Enable auto-dispose echarts after the image is created.
    })
}
export function bdteEchartsMem(filePath:string,agent:string,timeList:Array<number>,mem:Array<number>,maxNum:number){
    if(maxNum<100){
        maxNum = 100;
    }else{
        maxNum = Number(((maxNum * 1.2)/10).toFixed(0))*10
    }
    let interval = Number((timeList.length/20).toFixed(0));
    let option = {
        backgroundColor: '#FFFFF5',
        title: {
          text: 'BDT 节点内存使用监控',
          subtext: `${agent} 节点数据统计 `,
          x: 'center'
        },
    
        legend: {
          // orient 设置布局方式，默认水平布局，可选值：'horizontal'（水平） ¦ 'vertical'（垂直）
          orient: 'horizontal',
          // x 设置水平安放位置，默认全图居中，可选值：'center' ¦ 'left' ¦ 'right' ¦ {number}（x坐标，单位px）
          x: 'left',
          // y 设置垂直安放位置，默认全图顶端，可选值：'top' ¦ 'bottom' ¦ 'center' ¦ {number}（y坐标，单位px）
          y: 'top',
          data: ['内存']
        },
    
        //  图表距边框的距离,可选值：'百分比'¦ {number}（单位px）
        grid: {
            top: '16%',   // 等价于 y: '16%'
            left: '3%', 
            right: '8%',
            bottom: '3%',
            containLabel: true
        },
    
        xAxis: {
          name: '时间',
          type: 'category',
          axisLine: {
            lineStyle: {
              // 设置x轴颜色
              color: '#000000'
            }
          },
          // 设置X轴数据旋转倾斜
          axisLabel: {
            rotate: 30, // 旋转角度
            interval  //设置X轴数据间隔几个显示一个，为0表示都显示d
            },
          // boundaryGap值为false的时候，折线第一个点在y轴上
          boundaryGap: false,
          data: timeList
        },
    
        yAxis: {
          name: '内存(KB)',
          type: 'value',
          min:0, // 设置y轴刻度的最小值
          max:maxNum,  // 设置y轴刻度的最大值
          splitNumber:9,  // 设置y轴刻度间隔个数
          axisLine: {
            lineStyle: {
              // 设置y轴颜色
              color: '#000000'
            }
          },
        }, 
        series: [
            {
              name: '内存',
              data: mem,
              type: 'line',
              // 设置折线上圆点大小
              symbolSize:1,
              itemStyle:{
                normal:{
                  // 拐点上显示数值
                  label : {
                  show: false
                  },
                  borderColor:'red',  // 拐点边框颜色
                  lineStyle:{                 
                    width:1,  // 设置线宽
                    type:'solid'  //'dotted'虚线 'solid'实线
                  }
                }
              }
            },
          ],       
        color: ['#00EE00']
      };
    node_echarts({
      width: 2000, // Image width, type is number.
      height: 500, // Image height, type is number.
      option: option, // Echarts configuration, type is Object.
      path: filePath, // Path is filepath of the image which will be created.
      enableAutoDispose: true //Enable auto-dispose echarts after the image is created.
    })
}


