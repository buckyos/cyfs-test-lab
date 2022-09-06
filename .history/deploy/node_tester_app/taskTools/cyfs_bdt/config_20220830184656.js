"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportBDTPeer = exports.ReportAgent = exports.ReportTestcase = exports.ReportTask = exports.ReportAction = exports.saveJson = exports.MaxTaskNum = exports.ErrorBreak = exports.MaxConcurrency = void 0;
exports.MaxConcurrency = 10; // 测试任务最大并发数
exports.ErrorBreak = false; // 错误是否退出 
exports.MaxTaskNum = 100; // 测试任务最大执行次数，目的快速执行全部用例
exports.saveJson = true; //保存测试数据到JSON
exports.ReportAction = true; //Action 操作是否数据上报Mysql
exports.ReportTask = true; //Task 操作是否数据上报Mysql
exports.ReportTestcase = true; //Testcase 操作是否数据上报Mysql
exports.ReportAgent = true; //上报Agent测试节点数据
exports.ReportBDTPeer = true; //上报BDT客户端数据

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvdGFza1Rvb2xzL2N5ZnNfYmR0L2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBYSxRQUFBLGNBQWMsR0FBRyxFQUFFLENBQUMsQ0FBQyxZQUFZO0FBQ2pDLFFBQUEsVUFBVSxHQUFHLEtBQUssQ0FBQyxDQUFDLFVBQVU7QUFDOUIsUUFBQSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0JBQXdCO0FBQ3hDLFFBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDLGFBQWE7QUFDOUIsUUFBQSxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsc0JBQXNCO0FBQzNDLFFBQUEsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLG9CQUFvQjtBQUN2QyxRQUFBLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQyx3QkFBd0I7QUFDL0MsUUFBQSxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsZUFBZTtBQUNuQyxRQUFBLGFBQWEsR0FBRyxJQUFJLENBQUMsQ0FBQyxZQUFZIiwiZmlsZSI6InRhc2tUb29scy9jeWZzX2JkdC9jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgTWF4Q29uY3VycmVuY3kgPSAxMDsgLy8g5rWL6K+V5Lu75Yqh5pyA5aSn5bm25Y+R5pWwXG5leHBvcnQgY29uc3QgRXJyb3JCcmVhayA9IGZhbHNlOyAvLyDplJnor6/mmK/lkKbpgIDlh7ogXG5leHBvcnQgY29uc3QgTWF4VGFza051bSA9IDE7IC8vIOa1i+ivleS7u+WKoeacgOWkp+aJp+ihjOasoeaVsO+8jOebrueahOW/q+mAn+aJp+ihjOWFqOmDqOeUqOS+i1xuZXhwb3J0IGNvbnN0IHNhdmVKc29uID0gdHJ1ZTsgLy/kv53lrZjmtYvor5XmlbDmja7liLBKU09OXG5leHBvcnQgY29uc3QgUmVwb3J0QWN0aW9uID0gdHJ1ZTsgLy9BY3Rpb24g5pON5L2c5piv5ZCm5pWw5o2u5LiK5oqlTXlzcWxcbmV4cG9ydCBjb25zdCBSZXBvcnRUYXNrID0gdHJ1ZTsgLy9UYXNrIOaTjeS9nOaYr+WQpuaVsOaNruS4iuaKpU15c3FsXG5leHBvcnQgY29uc3QgUmVwb3J0VGVzdGNhc2UgPSB0cnVlOyAvL1Rlc3RjYXNlIOaTjeS9nOaYr+WQpuaVsOaNruS4iuaKpU15c3FsXG5leHBvcnQgY29uc3QgUmVwb3J0QWdlbnQgPSB0cnVlOyAvL+S4iuaKpUFnZW505rWL6K+V6IqC54K55pWw5o2uXG5leHBvcnQgY29uc3QgUmVwb3J0QkRUUGVlciA9IHRydWU7IC8v5LiK5oqlQkRU5a6i5oi356uv5pWw5o2uXG5cbiJdfQ==
