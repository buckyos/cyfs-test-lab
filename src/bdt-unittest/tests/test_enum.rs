use actix_rt;
use bdt_unittest::*;
use serde::{Deserialize, Serialize};
use bdt_utils::*;
#[derive(Clone, Debug)]
pub enum TransTaskGroupControlAction {
    Resume,
    Cancel,
    Pause,
}

#[cfg(test)]

mod tests {
    use std::fmt::format;
    use super::*;
    #[tokio::test]
    async fn test_enum_001() {
        run_test_async("test_enum_001", async{
            log::info!("TransTaskGroupControlAction::Resume = {:#?}",TransTaskGroupControlAction::Resume);
            log::info!("TransTaskGroupControlAction::Cancel = {:#?}",TransTaskGroupControlAction::Cancel); 
            log::info!("TransTaskGroupControlAction::Pause = {:#?}",TransTaskGroupControlAction::Pause);            
        }).await
    }
}