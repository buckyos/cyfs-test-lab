
use tokio::time::{sleep, Duration};

async fn fun1(sleep: u64) -> i32 {
    println!("fun1 is running");
    sleep(Duration::from_secs(sleep)).await;
    println!("fun1 is finished");
    return 1;
}

async fn fun2(sleep: u64) -> i32 {
    println!("fun2 is running");
    sleep(Duration::from_secs(sleep)).await;
    println!("fun2 is finished");
    return 2;
}

mod tests {
    #[tokio::test]
    async fn main(){
        println!("Start running");
        let task1 = fun1(3);
        let task2 = fun2(2);
        println!("Start finished");
        print!(await task1);
        print!(await task2);
        print("Run finished")
    }
}