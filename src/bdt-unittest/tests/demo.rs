

use actix_rt;
use std::*;

use std::sync::Once; 

static INIT: Once = Once::new();
static INIT_END: Once = Once::new();
pub async fn setup() -> () { 
    INIT.call_once(|| {
        //函数第一次执行会执行该部分内容
        let log_dir : String = "E:\\git_test\\FFS\\rust_src\\tests\\qa-test-tool\\log".to_string();
        #[cfg(debug_assertions)]
        let log_default_level = "debug";
        #[cfg(not(debug_assertions))]
        let log_default_level = "debug";
        cyfs_debug::CyfsLoggerBuilder::new_app("qa-test-tool")
            .level(log_default_level)
            .console("warn")
            .directory(log_dir.clone())
            .build()
            .unwrap()
            .start();
        //panic异常捕获
        cyfs_debug::PanicBuilder::new("qa-test-tool", "qa-test-tool")
            .exit_on_panic(true)
            .build()
            .start(); 
        
        log::info!("before_all fun run");
    });
    //函数每次调用都会执行该部分
    log::info!("before_each fun run");
}
pub async fn teardown() -> () { 
    INIT_END.call_once(|| {
        log::info!("after_each fun run");
    });
}
use std::future::Future;
pub async fn run_test_async<F: Future>(test: F)
  {
    setup().await; 
   // test();
    let result =  move ||{
        async move {
            test.await;
        }
        
    };
    result().await;

    teardown().await;  
}

//<F: FnOnce() -> R + UnwindSafe, R>(f: F) -> Result<R>
pub async fn run_test<T>(test: T) ->  ()
    where T: FnOnce() -> () + panic::UnwindSafe
{
    setup().await; 
    let result = panic::catch_unwind(move ||{
        async move{
            test();
        }
        
    });
    teardown().await;  
    assert!(result.is_ok());
}

pub fn function_under_test()->u32{
    let a =  100;
    a
}
pub async fn function_async()->u32{
    let a =  100;
    a
}
pub fn after_all(){

}

#[cfg(test)]
mod tests{
    //use non_lib::SharedObjectStack;
    use crate::run_test;
    use crate::run_test_async;
    use crate::function_under_test;
    use crate::after_all;
    use crate::function_async;
    #[test]
    pub fn test_demo_formal(){
        log::info!("send file failed");
    }
    //asyc 函数测试
    //#[actix_rt::test]
    // pub async  fn  test_demo_async_aync() {
    //     let mut stack  = SharedObjectStack::open_runtime(None).await.unwrap();
    // }
    //panic 异常函数的测试
    #[test]
    #[should_panic(expected = "Divide result is zero")]
    pub fn test_demo_panic(){
        panic!("Divide result is zero");
    }
    // before_each 和 after_each 的实现,before_all 可以使用，但after_all不能用内置方法实现，可以手工在末尾写一个函数
    #[actix_rt::test]
    async fn test_demo_setup_one() {
        run_test(  || {
                {
                    let ret_value = function_under_test();
                    log::info!("testcase run");
                    function_async();
                }           
        }).await
    }
    // 异步的封装
    #[actix_rt::test]
    async fn test_demo_setup_async() {
        run_test_async( async {
                let ret_value = function_under_test();
                let ret_value = function_under_test();
                log::info!("testcase run");
                function_async().await;
      
        }).await
    }
    // 文件IO操作函数
    #[actix_rt::test]
    async fn test_demo_file_write() {
        run_test(|| {
            use std::io::Write;
            let mut file = std::fs::File::create("data.txt").expect("create failed");
            file.write_all("简单教程".as_bytes()).expect("write failed");
            file.write_all("\n简单编程".as_bytes()).expect("write failed");
            log::info!("文件创建成功:{:?}",file);
        }).await
    }
    #[actix_rt::test]
    async fn test_demo_file_read() {
        run_test(|| {
            use std::io::Read;
            let mut file = std::fs::File::open("data.txt").unwrap();
            let mut contents = String::new();
            file.read_to_string(&mut contents).unwrap();
            log::info!("{}", contents);
        }).await
    }
    #[actix_rt::test]
    async fn test_demo_file_append() {
        run_test(|| {
            use std::fs::OpenOptions;
            use std::io::Write;
            let mut file = OpenOptions::new().append(true).open("data.txt").expect(
                "cannot open file");
             file.write_all("www.twle.cn".as_bytes()).expect("write failed");
             file.write_all("\n简单教程".as_bytes()).expect("write failed");
             file.write_all("\n简单编程".as_bytes()).expect("write failed");
        }).await
    }
    #[actix_rt::test]
    async fn test_demo_file_copy() {
        run_test(|| {
            use std::fs::OpenOptions;
            use std::io::Write;
            use std::io::Read;
            let mut file_in = std::fs::File::open("data.txt").unwrap();
            let mut file_out = std::fs::File::create("data1.txt").unwrap();
            let mut buffer = [0u8; 4096];
            loop {
                let nbytes = file_in.read(&mut buffer).unwrap();
                file_out.write(&buffer[..nbytes]).unwrap();
                if nbytes < buffer.len() { break; }
            }
        }).await
    }
    #[actix_rt::test]
    async fn test_demo_file_remove() {
        run_test(|| {
            use std::fs;
            fs::remove_file("data1.txt").expect("could not remove file");
        }).await
    }
    // 泛型使用
    struct Result<T,E> {
        x:T,
        y:E
    }
    impl<T,E> Result<T,E>{
        fn mix<V,W>(self,other:Result<V,W>)->Result<T,W>{
            Result{
                x:self.x,
                y:other.y
            }
        }
    }
    enum Test<T>{
        None,
        Some(T)
    }
    #[actix_rt::test]
    async fn test_demo_type_interface() {
        run_test(|| {
            let r1 = Result{x:5,y:6};
            let r2 = Result{x:5,y:"c"};
            let r3 = r1.mix(r2);
            log::info!("x = {},y = {}",r3.x,r3.y);
        }).await
    }
    //trait 使用
    pub trait Summary {
        
        fn summarize(&self) -> String {
            format!("(Read more from )")
        }
        //子类型能继承改方法
        fn summarizeDefault(&self) -> String {
            format!("(Read more from )")
        }
        // 定义一个抽象函数
        fn summarize_author(&self) -> String;

    }
    // pub trait Display {
    //     // fn summarize(&self) -> String {
    //     //     format!("(Read more from )")
    //     // }
    // }
    pub struct NewsArticle {
        pub headline: String,
        pub location: String,
        pub author: String,
        pub content: String,
    }
    
    impl Summary for NewsArticle {
        // 类似函数重载
        fn summarize(&self) -> String {
            format!("{}, by {} ({})", self.headline, self.author, self.location)
        } 
        // 类型抽象函数的实现，若无具体实现会报错，除非自己也是trait
        fn summarize_author(&self) -> String {
            format!("@{}", self.author)
        }
    }
    
    pub struct Tweet {
        pub username: String,
        pub content: String,
        pub reply: bool,
        pub retweet: bool,
    }
    
    impl Summary for Tweet {
        fn summarize(&self) -> String {
            format!("{}: {}", self.username, self.content)
        }
        fn summarize_author(&self) -> String {
            format!("@{}", self.username)
        }
    }
    //trait 作为参数
    pub fn notify(item: impl Summary) {
        log::info!("Breaking news! {}", item.summarize());
    }
    pub fn notifyType<T: Summary>(item: T) {
        log::info!("Breaking news! {}", item.summarize());
    }
    pub fn notify_1(item1: impl Summary, item2: impl Summary) {
        log::info!("Breaking news! {}", item1.summarize());
        log::info!("Breaking news! {}", item2.summarize());
    }
    //这种可以限制两个参数输入类型相同
    pub fn notify_2<T:Summary>(item1: T, item2: T) {
        log::info!("Breaking news! {}", item1.summarize());
        log::info!("Breaking news! {}", item2.summarize());
    }
    use std::fmt;
    pub fn notify_3(item: impl Summary + fmt::Display) {
        log::info!("Breaking news! {}", item.summarize());
    }
    pub fn notify_4<T: Summary+ fmt::Display>(item: T) {
        log::info!("Breaking news! {}", item.summarize());
    }
    pub fn notify_5<T>(item: T) where T: Summary+ fmt::Display {
        log::info!("Breaking news! {}", item.summarize());
    }
    fn returns_summarizable() -> impl Summary {
        Tweet {
            username: String::from("horse_ebooks"),
            content: String::from("of course, as you probably already know, people"),
            reply: false,
            retweet: false,
        }
    }
    // 错误的例子注释掉
    // fn returns_summarizable_1(switch: bool) -> impl Summary {
    //     if switch {
    //         NewsArticle {
    //             headline: String::from("Penguins win the Stanley Cup Championship!"),
    //             location: String::from("Pittsburgh, PA, USA"),
    //             author: String::from("Iceburgh"),
    //             content: String::from("The Pittsburgh Penguins once again are the best
    //             hockey team in the NHL."),
    //         };
    //     } else {
    //         Tweet {
    //             username: String::from("horse_ebooks"),
    //             content: String::from("of course, as you probably already know, people"),
    //             reply: false,
    //             retweet: false,
    //         };
    //     }
    // }
    

    #[actix_rt::test]
    async fn test_demo_trait() {
        run_test(|| {
            let article = NewsArticle {
                headline: String::from("Penguins win the Stanley Cup Championship!"),
                location: String::from("Pittsburgh, PA, USA"),
                author: String::from("Iceburgh"),
                content: String::from("The Pittsburgh Penguins once again are the best
                hockey team in the NHL."),
            };
            let tweet = Tweet {
                username: String::from("horse_ebooks"),
                content: String::from("of course, as you probably already know, people"),
                reply: false,
                retweet: false,
            };
            // 方法重载
            log::info!("New article available! {}", article.summarize());
            // 方法继承
            log::info!("New article available! {}", article.summarizeDefault());
            notify(article);
        }).await
    }

    //生命周期
    fn lifetime_demo1(){
        //禁止悬垂引用编译报错注释掉
        // let r;
        // {
        //     let x = 5;
        //     r = &x;
        // }
        // log::info!("r: {}", r);
    }
    // 闭包
    //函数方式实现
    
   use std::thread;
   use std::time::Duration;
   fn simulated_expensive_calculation(intensity: u32) -> u32 {
        println!("calculating slowly...");
        thread::sleep(Duration::from_secs(2));
        intensity
    }
    fn generate_workout_fn(intensity: u32, random_number: u32) {
        let expensive_result =
            simulated_expensive_calculation(intensity);

        if intensity < 25 {
            println!(
                "Today, do {} pushups!",
                expensive_result
            );
            println!(
                "Next, do {} situps!",
                expensive_result
            );
        } else {
            if random_number == 3 {
                println!("Take a break today! Remember to stay hydrated!");
            } else {
                println!(
                    "Today, run for {} minutes!",
                    expensive_result
                );
            }
        }
    }
    //闭包方式实现
    fn generate_workout_lambda(intensity: u32, random_number: u32) {
        let expensive_closure = |num| {
            log::info!("calculating slowly...");
            thread::sleep(Duration::from_secs(2));
            num
        };
    
        if intensity < 25 {
            log::info!(
                "Today, do {} pushups!",
                expensive_closure(intensity)
            );
            log::info!(
                "Next, do {} situps!",
                expensive_closure(intensity)
            );
        } else {
            if random_number == 3 {
                log::info!("Take a break today! Remember to stay hydrated!");
            } else {
                log::info!(
                    "Today, run for {} minutes!",
                    expensive_closure(intensity)
                );
            }
        }
    }

    #[actix_rt::test]
    async fn test_demo_lambda() {
        run_test(|| {
            generate_workout_fn(20,20);
            generate_workout_lambda(20,20);
        }).await;
    }
    // 闭包 + async + move 实现方式
    async fn lambda_async() {
        let expensive_closure =  move |num|{
            log::info!("执行这里1");
            async move{
                log::info!("执行这里2");
                function_async().await;
            }
        };
        expensive_closure(2).await;
    }
 
    #[actix_rt::test]
    async fn test_demo_lambda3() {
        //函数第一次执行会执行该部分内容
        let log_dir : String = "E:\\git_test\\FFS\\rust_src\\tests\\qa-test-tool\\log".to_string();
        #[cfg(debug_assertions)]
        let log_default_level = "debug";
        #[cfg(not(debug_assertions))]
        let log_default_level = "debug";
        cyfs_debug::CyfsLoggerBuilder::new_app("qa-test-tool")
            .level(log_default_level)
            .console("warn")
            .directory(log_dir.clone())
            .build()
            .unwrap()
            .start();
        //panic异常捕获
        cyfs_debug::PanicBuilder::new("qa-test-tool", "qa-test-tool");
        log::info!("执行这里3");
        lambda_async().await;
        log::info!("执行这里4");
    }
    use std::future::Future;
    pub struct TestCaseRunnner {
        pub runSum: u32,
        pub total: u32,
        pub success: u32,
        pub failed: u32,
    }
}



