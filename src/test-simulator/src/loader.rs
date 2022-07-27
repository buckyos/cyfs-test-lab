use crate::profile::TEST_PROFILE;
use crate::user::*;
use crate::zone::*;
use cyfs_base::*;
use cyfs_core::*;
use cyfs_lib::*;
use cyfs_stack_loader::*;

use once_cell::sync::OnceCell;
use std::sync::Arc;

//const USER_MNEMONIC: &str =
//    "paper grant gap across doctor hockey life decline sauce what aunt jelly";

pub static USER1_DATA: OnceCell<TestUserData> = OnceCell::new();
pub static USER2_DATA: OnceCell<TestUserData> = OnceCell::new();

pub static USERS_DATA: OnceCell<Vec<TestUserData>> = OnceCell::new();

//默认起始端口号
pub static BDT_PORT: u16 = 20000;
pub static SERVICE_PORT: u16 = 21000;
// 生成随机助记词
pub fn random_mnemonic() {
    use bip39::*;

    let mn = Mnemonic::generate_in(Language::English, 12).unwrap();
    println!("random mnemonic as follows:\n{}", mn.to_string());
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub enum DeviceIndex {
    User1OOD,
    User1StandbyOOD,
    User1Device1,
    User1Device2,

    User2OOD,
    User2Device1,
    User2Device2,
}

fn new_dec(name: &str) -> ObjectId {
    let owner_id = &USER1_DATA.get().unwrap().people_id;
    let dec_id = DecApp::generate_id(owner_id.object_id().to_owned(), name);

    info!("generage dec_id={}, people={}", dec_id, owner_id);

    dec_id
}

lazy_static::lazy_static! {
    pub static ref DEC_ID: ObjectId = new_dec("zone-simulator");
}

pub struct TestLoader {}

impl TestLoader {
    pub fn new() -> Self {
        Self {}
    }

    pub fn get_dec_id() -> &'static ObjectId {
        &DEC_ID
    }

    pub fn get_id(index: DeviceIndex) -> String {
        let ret = match index {
            DeviceIndex::User1OOD => &USER1_DATA.get().unwrap().ood_id,
            DeviceIndex::User1StandbyOOD => {
                &USER1_DATA.get().unwrap().standby_ood_id.as_ref().unwrap()
            }
            DeviceIndex::User1Device1 => &USER1_DATA.get().unwrap().device1_id,
            DeviceIndex::User1Device2 => &USER1_DATA.get().unwrap().device2_id,

            DeviceIndex::User2OOD => &USER2_DATA.get().unwrap().ood_id,
            DeviceIndex::User2Device1 => &USER2_DATA.get().unwrap().device1_id,
            DeviceIndex::User2Device2 => &USER2_DATA.get().unwrap().device2_id,
        };

        ret.to_string()
    }

    pub fn get_stack(index: DeviceIndex) -> CyfsStack {
        let id = Self::get_id(index);

        CyfsServiceLoader::cyfs_stack(Some(&id))
    }

    pub fn get_shared_stack(index: DeviceIndex) -> SharedCyfsStack {
        let id = Self::get_id(index);

        let stack = CyfsServiceLoader::shared_cyfs_stack(Some(&id));
        if stack.dec_id().is_none() {
            stack.bind_dec(DEC_ID.clone());
        }

        stack
    }

    pub async fn load_default() {
        let users = TestLoader::load_users(TEST_PROFILE.get_mnemonic(), true, false, 2).await;

        TEST_PROFILE.save_desc();
        let mut index: u16 = 0;
        for user in users {
            TestLoader::load_stack(user, 20000 + index, 30000 + index).await;
            index = index + 10;
        }
        //TestLoader::load_stack(user1, user2).await;
    }

    pub async fn load_users(
        mnemonic: &str,
        as_default: bool,
        dump: bool,
        user_num: usize,
    ) -> Vec<TestUser> {
        CyfsServiceLoader::prepare_env().await.unwrap();

        KNOWN_OBJECTS_MANAGER.clear();
        // 首先创建people/device信息组
        let mut user_list: Vec<TestUser> = Vec::new();
        let mut user_datas: Vec<TestUserData> = Vec::new();
        for user_index in 0..user_num {
            let user_name: &str = &format!("user{}", user_index.to_string());
            let user = Self::create_user(mnemonic, user_name,user_index as u32).await;
            if as_default {
                user_datas.push(user.user_data());
            }
            Self::init_user_objects(&user);
            if dump {
                let etc_dir = cyfs_util::get_service_config_dir("zone-simulator");
                user.dump(&etc_dir.join(user_name));
            }
            user_list.push(user);
        }
        USERS_DATA.set(user_datas).unwrap();
        user_list
    }

    pub async fn load_stack(user1: TestUser, bdt_port: u16, service_port: u16) {
        // 初始化协议栈
        let t1 = async_std::task::spawn(async move {
            let zone = TestZone::new(true, bdt_port, service_port, user1);
            zone.init().await;
        });
        ::futures::join!(t1);

        info!(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\nload zone stacks complete!\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    }

    fn init_user_objects(user: &TestUser) {
        let mut list = Vec::new();
        let obj = KnownObject {
            object_id: user.people.desc().calculate_id(),
            object_raw: user.people.to_vec().unwrap(),
            object: Arc::new(AnyNamedObject::Standard(StandardObject::People(
                user.people.clone(),
            ))),
        };
        list.push(obj);

        let obj = KnownObject {
            object_id: user.ood.device.desc().calculate_id(),
            object_raw: user.ood.device.to_vec().unwrap(),
            object: Arc::new(AnyNamedObject::Standard(StandardObject::Device(
                user.ood.device.clone(),
            ))),
        };
        list.push(obj);

        let obj = KnownObject {
            object_id: user.device1.device.desc().calculate_id(),
            object_raw: user.device1.device.to_vec().unwrap(),
            object: Arc::new(AnyNamedObject::Standard(StandardObject::Device(
                user.device1.device.clone(),
            ))),
        };
        list.push(obj);

        let obj = KnownObject {
            object_id: user.device2.device.desc().calculate_id(),
            object_raw: user.device2.device.to_vec().unwrap(),
            object: Arc::new(AnyNamedObject::Standard(StandardObject::Device(
                user.device2.device.clone(),
            ))),
        };
        list.push(obj);

        KNOWN_OBJECTS_MANAGER.append(list);
    }

    async fn create_user(mnemonic: &str, user_name: &str,index: u32) -> TestUser {
        let mnemonic1 = mnemonic.to_owned();
        let user = TestUser::new(user_name, &mnemonic1, index, OODWorkMode::Standalone).await;
        user
    }
}
