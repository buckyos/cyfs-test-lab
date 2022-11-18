

describe("all", async function () {
    before(function () {
        console.log("------------------------------before all moudle tests---------------------------")

    })
    after(function () {
        console.log("------------------------------after all moudle tests-----------------------------------")

    })

    require('./test_util_testcase')
    // require('./test_NDN_interface')
    // require('./test_NON_interface')
    // require('./test_beta_non')
    // require('./test_crypto_interface')
    // require('./test_handler_interface')
    // require('./test_root_state')
    // require('./test_sync_data_smoke')
    // require('./test_trans_interface')

})




