use cyfs_base::*;
use cyfs_core::*;
use cyfs_lib::*;
use cyfs_util::*;
#[macro_use]
extern crate log;

use core::time::Duration;
use std::str::FromStr;

use criterion::{criterion_group, criterion_main, Criterion};
use criterion::async_executor::FuturesExecutor;

fn new_dec(name: &str) -> ObjectId {
    let owner_id = ObjectId::from_str("5aSixgLtjoYcAFH9isc6KCqDgKfTJ8jpgASAoiRz5NLk").unwrap();

    let dec_id = DecApp::generate_id(owner_id.to_owned(), name);

    info!("generage test perf  dec_id={}, people={}", dec_id, owner_id);

    dec_id
}

fn qa_pair() -> (Text, Text) {
    let q = Text::build("question", "test_header", "hello!")
        .no_create_time()
        .build();
    let a = Text::build("answer", "test_header", "world!")
        .no_create_time()
        .build();

    (q, a)
}

struct OnPutObjectWatcher;

#[async_trait::async_trait]
impl EventListenerAsyncRoutine<RouterHandlerPutObjectRequest, RouterHandlerPutObjectResult>
    for OnPutObjectWatcher
{
    async fn call(
        &self,
        param: &RouterHandlerPutObjectRequest,
    ) -> BuckyResult<RouterHandlerPutObjectResult> {
        info!("watch_put_object: {}", param.request.object.object_id);

        let result = RouterHandlerPutObjectResult {
            action: RouterHandlerAction::Pass,
            request: None,
            response: None,
        };

        Ok(result)
    }
}

struct OnPutObject;

#[async_trait::async_trait]
impl EventListenerAsyncRoutine<RouterHandlerPutObjectRequest, RouterHandlerPutObjectResult>
    for OnPutObject
{
    async fn call(
        &self,
        param: &RouterHandlerPutObjectRequest,
    ) -> BuckyResult<RouterHandlerPutObjectResult> {
        info!("handler_put_object: {}", param.request.object.object_id);

        let (q, _a) = qa_pair();

        let object = Text::clone_from_slice(&param.request.object.object_raw).unwrap();
        let result = if *object.text_id().object_id() == *q.text_id().object_id() {
            let response = NONPutObjectInputResponse {
                result: NONPutObjectResult::Accept,
                object_expires_time: None,
                object_update_time: None,
            };

            // 使用answer对象应答
            RouterHandlerPutObjectResult {
                action: RouterHandlerAction::Response,
                request: None,
                response: Some(Ok(response)),
            }
        } else {
            // 其余对象，直接返回NotSupport
            let msg = format!(
                "put object id not support! req={}",
                param.request.object.object_id
            );
            warn!("{}", msg);
            let response = Err(BuckyError::new(BuckyErrorCode::NotSupport, msg));

            RouterHandlerPutObjectResult {
                action: RouterHandlerAction::Response,
                request: None,
                response: Some(response),
            }
        };

        Ok(result)
    }
}

struct OnPostObject;

#[async_trait::async_trait]
impl EventListenerAsyncRoutine<RouterHandlerPostObjectRequest, RouterHandlerPostObjectResult>
    for OnPostObject
{
    async fn call(
        &self,
        param: &RouterHandlerPostObjectRequest,
    ) -> BuckyResult<RouterHandlerPostObjectResult> {
        info!("handler_post_object: {}", param.request.object.object_id);

        let (q, a) = qa_pair();

        let object = Text::clone_from_slice(&param.request.object.object_raw).unwrap();
        let result = if *object.text_id().object_id() == *q.text_id().object_id() {
            let response = NONPostObjectInputResponse {
                object: Some(NONObjectInfo::new(
                    a.text_id().object_id().to_owned(),
                    a.to_vec().unwrap(),
                    None,
                )),
            };

            // 使用answer对象应答
            RouterHandlerPostObjectResult {
                action: RouterHandlerAction::Response,
                request: None,
                response: Some(Ok(response)),
            }
        } else {
            let msg = format!(
                "post object id not support! req={}",
                param.request.object.object_id
            );
            warn!("{}", msg);
            let response = Err(BuckyError::new(BuckyErrorCode::NotFound, msg));

            // 其余对象，直接返回
            RouterHandlerPostObjectResult {
                action: RouterHandlerAction::Response,
                request: None,
                response: Some(response),
            }
        };

        Ok(result)
    }
}

struct OnGetObject;

#[async_trait::async_trait]
impl EventListenerAsyncRoutine<RouterHandlerGetObjectRequest, RouterHandlerGetObjectResult>
    for OnGetObject
{
    async fn call(
        &self,
        param: &RouterHandlerGetObjectRequest,
    ) -> BuckyResult<RouterHandlerGetObjectResult> {
        info!("handler_get_object: {}", param.request.object_id);

        let (q, a) = qa_pair();

        assert!(*q.text_id().object_id() == param.request.object_id);

        let object_raw = a.to_vec().unwrap();
        info!("will return a: {:?}", object_raw);

        let mut response =
            NONGetObjectInputResponse::new(a.text_id().object_id().to_owned(), object_raw, None);
        response.init_times()?;

        // let object = Text::clone_from_slice(&param.object_raw).unwrap();
        let result = RouterHandlerGetObjectResult {
            action: RouterHandlerAction::Response,
            request: None,
            response: Some(Ok(response)),
        };

        Ok(result)
    }
}


async fn post_object(stack: &SharedCyfsStack, dec_id: &ObjectId) {

    let filter = format!("dec_id == {}", dec_id);

    // 添加一个处理器
    let listener = OnPostObject {};
    let ret = stack.router_handlers().add_handler(
        RouterHandlerChain::PreRouter,
        "post-object1",
        0,
        &filter,
        RouterHandlerAction::Default,
        Some(Box::new(listener)),
    );
    assert!(ret.is_ok());

    // 事件是异步注册的，需要等待
    async_std::task::sleep(std::time::Duration::from_secs(2)).await;

    // 发起一次QA
    {
        let (q, a) = qa_pair();
        let object_id = q.text_id().object_id().to_owned();

        let mut req = NONPostObjectOutputRequest::new_router(None, object_id, q.to_vec().unwrap());
        req.common.dec_id = Some(dec_id.clone());

        let ret = stack.non_service().post_object(req).await;

        match ret {
            Ok(resp) => {
                info!(
                    "post_object success! object_id={}, resp={}",
                    object_id, resp
                );
                let resp_object = resp.object.unwrap().object.unwrap();
                assert_eq!(resp_object.object_id(), a.text_id().object_id().to_owned());
            }
            Err(e) => {
                error!("post_object failed! object_id={}, {}", object_id, e);
                //unreachable!();
            }
        }
    }

    // 一次未处理的QA
    {
        let q = Text::build("simple", "test_header", "hello!")
            .no_create_time()
            .build();
        let object_id = q.text_id().object_id().to_owned();

        let mut req = NONPostObjectOutputRequest::new_router(None, object_id, q.to_vec().unwrap());
        req.common.dec_id = Some(dec_id.clone());

        let ret = stack.non_service().post_object(req).await;
        match ret {
            Ok(resp) => {
                error!(
                    "post_object but success! object_id={}, resp={}",
                    object_id, resp
                );
                unreachable!();
            }
            Err(e) => {
                info!("post_object but not found! object_id={}, {}", object_id, e);
                //assert_eq!(e.code(), BuckyErrorCode::NotFound);
            }
        }
    }
}


async fn put_object(stack: &SharedCyfsStack, dec_id: &ObjectId) {

    let filter = format!("dec_id == {}", dec_id);

    // 添加一个处理器
    let listener = OnPutObject {};
    let ret = stack.router_handlers().add_handler(
        RouterHandlerChain::PreRouter,
        "put-object1",
        0,
        &filter,
        RouterHandlerAction::Default,
        Some(Box::new(listener)),
    );
    assert!(ret.is_ok());

    // 添加一个观察者
    let listener = OnPutObjectWatcher {};
    let ret = stack.router_handlers().add_handler(
        RouterHandlerChain::PreRouter,
        "watch-object1",
        // 观察者模式使用负数索引
        -1,
        &filter,
        RouterHandlerAction::Pass,
        Some(Box::new(listener)),
    );
    assert!(ret.is_ok());

    // 事件是异步注册的，需要等待
    async_std::task::sleep(std::time::Duration::from_secs(2)).await;

    // 发起一次成功的put
    {
        let (q, _a) = qa_pair();
        let object_id = q.text_id().object_id().to_owned();

        let mut req = NONPutObjectOutputRequest::new_router(None, object_id, q.to_vec().unwrap());
        req.common.dec_id = Some(dec_id.clone());

        let ret = stack.non_service().put_object(req).await;

        match ret {
            Ok(resp) => {
                info!("put_object success! object_id={}, resp={}", object_id, resp);
                assert_eq!(resp.result, NONPutObjectResult::Accept);
            }
            Err(e) => {
                error!("put_object failed! object_id={}, {}", object_id, e);
                unreachable!();
            }
        }
    }

    // 一次失败的put
    {
        let q = Text::build("simple", "test_header", "hello!")
            .no_create_time()
            .build();
        let object_id = q.text_id().object_id().to_owned();

        let mut req = NONPutObjectOutputRequest::new_router(None, object_id, q.to_vec().unwrap());
        req.common.dec_id = Some(dec_id.clone());

        let ret = stack.non_service().put_object(req).await;
        match ret {
            Ok(resp) => {
                error!(
                    "put_object but success! object_id={}, resp={}",
                    object_id, resp
                );
                unreachable!();
            }
            Err(e) => {
                info!("put_object failed! object_id={}, {}", object_id, e);
                assert_eq!(e.code(), BuckyErrorCode::NotSupport);
            }
        }
    }
}

async fn get_object(stack: &SharedCyfsStack, dec_id: &ObjectId) {
    let filter = format!("dec_id == {}", dec_id);

    let listener = OnGetObject {};
    stack
        .router_handlers()
        .add_handler(
            RouterHandlerChain::PreRouter,
            "get-object1",
            0,
            &filter,
            RouterHandlerAction::Default,
            Some(Box::new(listener)),
        )
        .unwrap();

    // 事件是异步注册的，需要等待
    async_std::task::sleep(std::time::Duration::from_secs(2)).await;

    let (q, a) = qa_pair();
    let object_id = q.text_id().object_id().to_owned();

    let mut req = NONGetObjectOutputRequest::new_router(None, object_id, None);
    req.common.dec_id = Some(dec_id.clone());

    let ret = stack.non_service().get_object(req).await;
    let resp = ret.unwrap();

    let t = Text::clone_from_slice(&resp.object.object_raw).unwrap();
    assert_eq!(*t.text_id().object_id(), *a.text_id().object_id());
    assert_eq!(resp.object.object_id, *a.text_id().object_id());
}

pub async fn test_path_env_update(stack: &SharedCyfsStack, dec_id: &ObjectId) {
    // let dec_id = new_dec("root_state1");
    let root_state = stack.root_state_stub(None, Some(dec_id.clone()));
    let root_info = root_state.get_current_root().await.unwrap();
    info!("current root: {:?}", root_info);

    let x1_value = ObjectId::from_str("95RvaS5anntyAoRUBi48vQoivWzX95M8xm4rkB93DdSt").unwrap();
    let x2_value = ObjectId::from_str("95RvaS5F94aENffFhjY1FTXGgby6vUW2AkqWYhtzrtHz").unwrap();

    let path = "/test/update";

    let op_env = root_state.create_path_op_env().await.unwrap();

    // 首先移除老的值，如果存在的话
    op_env.remove_with_path(path, None).await.unwrap();

    let ret = op_env.get_by_path(path).await.unwrap();
    assert_eq!(ret, None);

    op_env.insert_with_path(path, &x1_value).await.unwrap();

    let root = op_env.update().await.unwrap();

    {
        let op_env = root_state.create_path_op_env().await.unwrap();
        let ret = op_env.get_by_path(path).await.unwrap();
        assert_eq!(ret, Some(x1_value));
    }

    let ret = op_env.get_by_path(path).await.unwrap();
    assert_eq!(ret, Some(x1_value));

    let ret = op_env
        .set_with_path(path, &x2_value, Some(x1_value.clone()), false)
        .await
        .unwrap();
    assert_eq!(ret, Some(x1_value));

    let root2 = op_env.update().await.unwrap();
    assert_ne!(root, root2);

    let root3 = op_env.commit().await.unwrap();
    assert_eq!(root3, root2);

    {
        let op_env = root_state.create_path_op_env().await.unwrap();
        let ret = op_env.get_by_path(path).await.unwrap();
        assert_eq!(ret, Some(x2_value));
    }
}

pub async fn test_path_env(stack: &SharedCyfsStack, dec_id: &ObjectId) {
    // let dec_id = new_dec("root_state1");
    let root_state = stack.root_state_stub(None, Some(dec_id.clone()));
    let root_info = root_state.get_current_root().await.unwrap();
    info!("current root: {:?}", root_info);

    let x1_value = ObjectId::from_str("95RvaS5anntyAoRUBi48vQoivWzX95M8xm4rkB93DdSt").unwrap();
    let x2_value = ObjectId::from_str("95RvaS5F94aENffFhjY1FTXGgby6vUW2AkqWYhtzrtHz").unwrap();

    let op_env = root_state.create_path_op_env().await.unwrap();

    // test create_new
    op_env.remove_with_path("/new", None).await.unwrap();
    op_env
        .create_new_with_path("/new/a", ObjectMapSimpleContentType::Map)
        .await
        .unwrap();
    op_env
        .create_new_with_path("/new/c", ObjectMapSimpleContentType::Set)
        .await
        .unwrap();

    if let Err(e) = op_env
        .create_new_with_path("/new/a", ObjectMapSimpleContentType::Map)
        .await
    {
        assert!(e.code() == BuckyErrorCode::AlreadyExists);
    } else {
        unreachable!();
    }

    if let Err(e) = op_env
        .create_new_with_path("/new/c", ObjectMapSimpleContentType::Map)
        .await
    {
        assert!(e.code() == BuckyErrorCode::AlreadyExists);
    } else {
        unreachable!();
    }

    // 首先移除老的值，如果存在的话
    op_env.remove_with_path("/x/b", None).await.unwrap();

    let ret = op_env.get_by_path("/x/b").await.unwrap();
    assert_eq!(ret, None);
    let ret = op_env.get_by_path("/x/b/c").await.unwrap();
    assert_eq!(ret, None);

    op_env
        .insert_with_key("/x/b", "c", &x1_value)
        .await
        .unwrap();

    let ret = op_env.get_by_path("/x/b/c").await.unwrap();
    assert_eq!(ret, Some(x1_value));

    let ret = op_env.remove_with_path("/x/b/d", None).await.unwrap();
    assert_eq!(ret, None);

    let root = op_env.commit().await.unwrap();
    info!("new dec root is: {:?}", root);

    {
        let op_env = root_state.create_path_op_env().await.unwrap();
        op_env.remove_with_path("/set", None).await.unwrap();

        let ret = op_env.insert("/set/a", &x2_value).await.unwrap();
        assert!(ret);

        let ret = op_env.contains("/set/a", &x1_value).await.unwrap();
        assert!(!ret);

        let ret = op_env.insert("/set/a", &x1_value).await.unwrap();
        assert!(ret);

        let ret = op_env.insert("/set/a", &x1_value).await.unwrap();
        assert!(!ret);

        let ret = op_env.remove("/set/a", &x1_value).await.unwrap();
        assert!(ret);

        let ret = op_env.insert("/set/a", &x1_value).await.unwrap();
        assert!(ret);

        let root = op_env.commit().await.unwrap();
        info!("new dec root is: {:?}", root);
    }

    info!("test root_state complete!");
}

pub async fn test_iterator(stack: &SharedCyfsStack, dec_id: &ObjectId) {
    let root_state = stack.root_state_stub(None, Some(dec_id.clone()));
    let root_info = root_state.get_current_root().await.unwrap();
    info!("current root: {:?}", root_info);

    let x1_value = ObjectId::from_str("95RvaS5anntyAoRUBi48vQoivWzX95M8xm4rkB93DdSt").unwrap();
    // let x2_value = ObjectId::from_str("95RvaS5F94aENffFhjY1FTXGgby6vUW2AkqWYhtzrtHz").unwrap();

    let op_env = root_state.create_path_op_env().await.unwrap();

    // 首先移除老的值，如果存在的话
    op_env.remove_with_path("/test/it", None).await.unwrap();

    let ret = op_env.get_by_path("/test/it").await.unwrap();
    assert!(ret.is_none());

    for i in 0..1000 {
        let key = format!("test_iterator_{:0>3}", i);
        op_env
            .insert_with_key("/test/it", &key, &x1_value)
            .await
            .unwrap();
    }

    op_env.commit().await.unwrap();

    // 测试枚举
    let single_env = root_state.create_single_op_env().await.unwrap();
    single_env.load_by_path("/test/it").await.unwrap();

    let mut all_list = vec![];
    loop {
        let mut ret = single_env.next(10).await.unwrap();
        if ret.len() == 0 {
            break;
        }

        info!("it got list: {:?}", ret);
        all_list.append(&mut ret);
    }

    single_env.reset().await.unwrap();
    let mut all_list2 = vec![];
    loop {
        let mut ret = single_env.next(10).await.unwrap();
        if ret.len() == 0 {
            break;
        }

        info!("it got list: {:?}", ret);
        all_list2.append(&mut ret);
    }

    assert_eq!(all_list, all_list2);

    let all_list3 = single_env.list().await.unwrap();
    assert_eq!(all_list, all_list3);
}

pub async fn test_gbk_path(stack: &SharedCyfsStack, dec_id: &ObjectId) {
    // let dec_id = new_dec("root_state1");
    let root_state = stack.root_state_stub(None, Some(dec_id.clone()));
    let root_info = root_state.get_current_root().await.unwrap();
    info!("current root: {:?}", root_info);

    let x1_value = ObjectId::from_str("95RvaS5anntyAoRUBi48vQoivWzX95M8xm4rkB93DdSt").unwrap();
    let x2_value = ObjectId::from_str("95RvaS5F94aENffFhjY1FTXGgby6vUW2AkqWYhtzrtHz").unwrap();

    let op_env = root_state.create_path_op_env().await.unwrap();

    // 首先移除老的值，如果存在的话
    op_env.remove_with_path("/xxx/八八八", None).await.unwrap();

    let ret = op_env.get_by_path("/xxx/八八八").await.unwrap();
    assert_eq!(ret, None);
    let ret = op_env.get_by_path("/xxx/八八八/七七七").await.unwrap();
    assert_eq!(ret, None);

    op_env
        .insert_with_key("/xxx/八八八", "七七七", &x1_value)
        .await
        .unwrap();

    let ret = op_env.get_by_path("/xxx/八八八/七七七").await.unwrap();
    assert_eq!(ret, Some(x1_value));

    let ret = op_env
        .remove_with_path("/xxx/八八八/六六六", None)
        .await
        .unwrap();
    assert_eq!(ret, None);

    let root = op_env.commit().await.unwrap();
    info!("new dec root is: {:?}", root);

    {
        let op_env = root_state.create_path_op_env().await.unwrap();
        op_env.remove_with_path("/gbk_set", None).await.unwrap();

        let ret = op_env.insert("/gbk_set/一二三", &x2_value).await.unwrap();
        assert!(ret);

        let ret = op_env.contains("/gbk_set/一二三", &x1_value).await.unwrap();
        assert!(!ret);

        let ret = op_env.insert("/gbk_set/一二三", &x1_value).await.unwrap();
        assert!(ret);

        let ret = op_env.insert("/gbk_set/一二三", &x1_value).await.unwrap();
        assert!(!ret);

        let ret = op_env.remove("/gbk_set/一二三", &x1_value).await.unwrap();
        assert!(ret);

        let ret = op_env.insert("/gbk_set/一二三", &x1_value).await.unwrap();
        assert!(ret);

        let list = op_env.list("/gbk_set").await.unwrap();
        assert_eq!(list.len(), 1);
        if let ObjectMapContentItem::Map((k, _v)) = &list[0] {
            assert_eq!(k, "一二三");
        }

        info!("list: {:?}", list);

        let list = op_env.list("/gbk_set/一二三").await.unwrap();
        assert_eq!(list.len(), 2);

        for item in list {
            if let ObjectMapContentItem::Set(v) = item {
                assert!(v == x1_value || v == x2_value);
            } else {
                unreachable!();
            }
        }

        let root = op_env.commit().await.unwrap();
        info!("new dec root is: {:?}", root);
    }

    info!("test root_state gbk complete!");
}



pub async fn test_storage(s: &SharedCyfsStack) {
    let x1_value = ObjectId::from_str("95RvaS5anntyAoRUBi48vQoivWzX95M8xm4rkB93DdSt").unwrap();
    let x2_value = ObjectId::from_str("95RvaS5F94aENffFhjY1FTXGgby6vUW2AkqWYhtzrtHz").unwrap();

    {
        let storage = s.global_state_storage_ex(
            GlobalStateCategory::RootState,
            "/",
            ObjectMapSimpleContentType::Map,
            None,
            Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
        );

        storage.init().await.unwrap();

        let map = StateStorageMap::new(storage);
        
        let list = map.list().await.unwrap();
        info!("list: {:?}", list);

        map.save().await.unwrap();
    }


    {
        let storage = s.global_state_storage_ex(
            GlobalStateCategory::RootState,
            "/user/friends",
            ObjectMapSimpleContentType::Map,
            None,
            Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
        );

        storage.init().await.unwrap();

        let map = StateStorageMap::new(storage);
        match map.remove("user1").await.unwrap() {
            Some(value) => {
                info!("remove current value: {}", value);
            }
            None => {
                info!("current value is none!");
            }
        }

        let list = map.list().await.unwrap();
        assert!(list.is_empty());

        map.save().await.unwrap();
    }

    {
        let storage = s.global_state_storage_ex(
            GlobalStateCategory::RootState,
            "/user/friends",
            ObjectMapSimpleContentType::Map,
            None,
            Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
        );

        storage.init().await.unwrap();

        let map = StateStorageMap::new(storage);
        let v = map.get("user1").await.unwrap();
        assert!(v.is_none());

        let prev = map.set("user1", &x1_value).await.unwrap();
        assert!(prev.is_none());

        map.storage().save().await.unwrap();

        let prev = map.set("user1", &x2_value).await.unwrap();
        assert_eq!(prev, Some(x1_value));

        map.storage().save().await.unwrap();
        map.storage().save().await.unwrap();

        let list = map.list().await.unwrap();
        assert!(list.len() == 1);
        let item = &list[0];
        assert_eq!(item.0, "user1");
        assert_eq!(item.1, x2_value);

        map.into_storage().abort().await;
    }

    {
        let storage = s.global_state_storage_ex(
            GlobalStateCategory::RootState,
            "/user/friends",
            ObjectMapSimpleContentType::Map,
            None,
            Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
        );

        storage.init().await.unwrap();

        let map = StateStorageMap::new(storage);
        let v = map.get("user1").await.unwrap();
        assert_eq!(v, Some(x2_value));

        map.abort().await;
    }

    // test auto_save
    {
        let storage = s.global_state_storage_ex(
            GlobalStateCategory::LocalCache,
            "/user/friends",
            ObjectMapSimpleContentType::Map,
            None,
            Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
        );

        storage.init().await.unwrap();
        storage.start_save(std::time::Duration::from_secs(5));

        let map = StateStorageMap::new(storage);
        map.remove("user2").await.unwrap();
        map.set("user2", &x1_value).await.unwrap();

        info!("will wait for auto save for user2...");
        async_std::task::sleep(std::time::Duration::from_secs(10)).await;

        info!("will drop map for user2...");
        drop(map);

        {
            let storage = s.global_state_storage_ex(
                GlobalStateCategory::LocalCache,
                "/user/friends",
                ObjectMapSimpleContentType::Map,
                None,
                Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
            );

            storage.init().await.unwrap();

            let map = StateStorageMap::new(storage);
            let ret = map.get("user2").await.unwrap();
            assert_eq!(ret, Some(x1_value));
        }
    }

    // test auto_save and drop
    {
        let storage = s.global_state_storage_ex(
            GlobalStateCategory::LocalCache,
            "/user/friends",
            ObjectMapSimpleContentType::Map,
            None,
            Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
        );

        storage.init().await.unwrap();

        let map = StateStorageMap::new(storage);
        map.remove("user2").await.unwrap();
        map.set("user2", &x1_value).await.unwrap();
        assert!(map.storage().is_dirty());

        map.storage().start_save(std::time::Duration::from_secs(5));
        async_std::task::sleep(std::time::Duration::from_secs(5)).await;
    }

    // test some set cases
    {
        let storage = s.global_state_storage_ex(
            GlobalStateCategory::RootState,
            "/user/index",
            ObjectMapSimpleContentType::Set,
            None,
            Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
        );

        storage.init().await.unwrap();

        let set = StateStorageSet::new(storage);
        set.remove(&x1_value).await.unwrap();
        set.remove(&x2_value).await.unwrap();

        set.save().await.unwrap();
        set.abort().await;
    }

    {
        let storage = s.global_state_storage_ex(
            GlobalStateCategory::RootState,
            "/user/index",
            ObjectMapSimpleContentType::Set,
            None,
            Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
        );

        storage.init().await.unwrap();

        let set = StateStorageSet::new(storage);
        assert!(!set.contains(&x1_value).await.unwrap());
        assert!(!set.contains(&x2_value).await.unwrap());

        set.insert(&x1_value).await.unwrap();
        assert!(set.contains(&x1_value).await.unwrap());

        set.save().await.unwrap();
        let ret = set.insert(&x2_value).await.unwrap();
        assert!(ret);

        let ret = set.insert(&x2_value).await.unwrap();
        assert!(!ret);

        set.save().await.unwrap();
    }

    {
        let storage = s.global_state_storage_ex(
            GlobalStateCategory::RootState,
            "/user/index",
            ObjectMapSimpleContentType::Set,
            None,
            Some(cyfs_core::get_system_dec_app().object_id().to_owned()),
        );

        storage.init().await.unwrap();

        let set = StateStorageSet::new(storage);

        let list = set.list().await.unwrap();
        assert!(list.len() == 2);
        assert!(list.iter().find(|&&v| v == x1_value).is_some());
        assert!(list.iter().find(|&&v| v == x2_value).is_some());

        set.abort().await;
    }

    info!("state storage test complete!");
}


static mut HAS_RUN: bool = false;

pub async fn test() {
    let dec_id = new_dec("test1");
    let mut param = SharedCyfsStackParam::default(None);
    param.requestor_config = CyfsStackRequestorConfig::ws();

    let stack = SharedCyfsStack::open(param).await.unwrap();

    unsafe {
        if HAS_RUN {
            post_object(&stack, &dec_id).await;
            put_object(&stack, &dec_id).await;
            get_object(&stack, &dec_id).await;

            test_storage(&stack).await;

            test_gbk_path(&stack, &dec_id).await;
    
            test_path_env(&stack, &dec_id).await;
            test_path_env_update(&stack, &dec_id).await;
            test_iterator(&stack, &dec_id).await;

        } else {
            HAS_RUN = true;
            print!("{}", dec_id);
            stack.wait_online(Some(std::time::Duration::from_secs(30))).await.unwrap();
        }
    }

}

fn criterion_benchmark(c: &mut Criterion) {

    c.bench_function("test", move |b| {
        b.to_async(FuturesExecutor)
            .iter(|| async { test().await })
    });

}

/*
criterion benchmark + FlameGraph + html
如果你无法测量，那你就无法改进（If you can’t measure it, you can’t improve it）。  jaeger
*/

criterion_group! {
    name = benches;
    config = Criterion::default().sample_size(100).measurement_time(Duration::new(60 * 60, 0));
    targets = criterion_benchmark
}
criterion_main!(benches);
