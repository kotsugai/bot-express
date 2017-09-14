'use strict';

const message_platform_list = ["line", "facebook"];

let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
let Webhook = require('../module/webhook');
let Util = require("../test_utility/test_utility");

chai.use(chaiAsPromised);
let should = chai.should();


describe("Collect Test", function(){
    let message_platform = "line";
    let user_id = "collect";

    describe("City is correct", function(){
        it("will go through all questions 1 by 1.", function(){
            this.timeout(8000);

            let options = Util.create_options();
            let webhook = new Webhook(options);
            return webhook.run(Util["create_req_to_clear_memory"](user_id)).then(
                function(response){
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "コレクトテスト"));
                }
            ).then(
                function(response){
                    // Bot is now asking zip_code.
                    response.should.have.property("confirming", "zip_code");
                    response.confirmed.should.deep.equal({});
                    response.to_confirm.should.have.lengthOf(3);
                    response.to_confirm[0].should.equal("zip_code");
                    response.to_confirm[1].should.equal("city");
                    response.to_confirm[2].should.equal("street");
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "107-0061"));
                }
            ).then(
                function(response){
                    // Bot is now asking if the address is correct.
                    response.should.have.property("confirming", "city");
                    response.confirmed.should.deep.equal({
                        zip_code: {
                            zip_code: "107-0061",
                            resolved_address: "東京都港区北青山"
                        }
                    });
                    response.to_confirm.should.have.lengthOf(2);
                    response.to_confirm[0].should.equal("city");
                    response.to_confirm[1].should.equal("street");
                    return webhook.run(Util.create_req(message_platform, "postback", user_id, "東京都港区北青山"));
                }
            ).then(
                function(response){
                    // Bot is now asking the street.
                    response.should.have.property("confirming", "street");
                    response.confirmed.should.deep.equal({
                        zip_code: {
                            zip_code: "107-0061",
                            resolved_address: "東京都港区北青山"
                        },
                        city: "東京都港区北青山"
                    });
                    response.to_confirm.should.have.lengthOf(1);
                    response.to_confirm[0].should.equal("street");
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "2-5-8"));
                }
            ).then(
                function(response){
                    // Completed.
                    response.should.have.property("confirming", null);
                    response.confirmed.should.deep.equal({
                        zip_code: {
                            zip_code: "107-0061",
                            resolved_address: "東京都港区北青山"
                        },
                        city: "東京都港区北青山",
                        street: "2-5-8"
                    });
                    response.to_confirm.should.have.lengthOf(0);
                }
            );
        });
    });

    describe("Claim city is incorrect", function(){
        it("will go bcck to zip code question.", function(){
            this.timeout(8000);

            let options = Util.create_options();
            let webhook = new Webhook(options);
            return webhook.run(Util["create_req_to_clear_memory"](user_id)).then(
                function(response){
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "コレクトテスト"));
                }
            ).then(
                function(response){
                    // Bot is now asking zip_code.
                    response.should.have.property("confirming", "zip_code");
                    response.confirmed.should.deep.equal({});
                    response.to_confirm.should.have.lengthOf(3);
                    response.to_confirm[0].should.equal("zip_code");
                    response.to_confirm[1].should.equal("city");
                    response.to_confirm[2].should.equal("street");
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "1070061"));
                }
            ).then(
                function(response){
                    // Bot is now asking if the address is correct.
                    response.should.have.property("confirming", "city");
                    response.confirmed.should.deep.equal({
                        zip_code: {
                            zip_code: "1070061",
                            resolved_address: "東京都港区北青山"
                        }
                    });
                    response.to_confirm.should.have.lengthOf(2);
                    response.to_confirm[0].should.equal("city");
                    response.to_confirm[1].should.equal("street");
                    return webhook.run(Util.create_req(message_platform, "postback", user_id, "いいえ"));
                }
            ).then(
                function(response){
                    // Bot is now asking zip_code once again.
                    response.should.have.property("confirming", "zip_code");
                    response.confirmed.should.deep.equal({});
                    response.to_confirm.should.have.lengthOf(3);
                    response.to_confirm[0].should.equal("zip_code");
                    response.to_confirm[1].should.equal("city");
                    response.to_confirm[2].should.equal("street");
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "1070062"));
                }
            ).then(
                function(response){
                    // Bot is now asking if the address is correct.
                    response.should.have.property("confirming", "city");
                    response.confirmed.should.deep.equal({
                        zip_code: {
                            zip_code: "1070062",
                            resolved_address: "東京都港区南青山"
                        }
                    });
                    response.to_confirm.should.have.lengthOf(2);
                    response.to_confirm[0].should.equal("city");
                    response.to_confirm[1].should.equal("street");
                    return webhook.run(Util.create_req(message_platform, "postback", user_id, "東京都港区南青山"));
                }
            ).then(
                function(response){
                    // Bot is now asking the street.
                    response.should.have.property("confirming", "street");
                    response.confirmed.should.deep.equal({
                        zip_code: {
                            zip_code: "1070062",
                            resolved_address: "東京都港区南青山"
                        },
                        city: "東京都港区南青山"
                    });
                    response.to_confirm.should.have.lengthOf(1);
                    response.to_confirm[0].should.equal("street");
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "2-5-8"));
                }
            ).then(
                function(response){
                    // Completed.
                    response.should.have.property("confirming", null);
                    response.confirmed.should.deep.equal({
                        zip_code: {
                            zip_code: "1070062",
                            resolved_address: "東京都港区南青山"
                        },
                        city: "東京都港区南青山",
                        street: "2-5-8"
                    });
                    response.to_confirm.should.have.lengthOf(0);
                }
            );
        });
    });

    describe("collect by collect_by_param", function(){
        it("will successfully add new param to skill.dynamic_parameter and to_confirm.", function(){
            this.timeout(8000);

            let options = Util.create_options();
            let webhook = new Webhook(options);
            return webhook.run(Util["create_req_to_clear_memory"](user_id)).then(
                function(response){
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "住民票を申請したい"));
                }
            ).then(
                function(response){
                    // Bot is now asking juminhyo type
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "本人だけ"));
                }
            ).then(
                function(response){
                    // Bot is now asking name.
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "中嶋一樹です"));
                }
            ).then(
                function(response){
                    // Bot is now confirming if name is correct.
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "はい"));
                }
            ).then(
                function(response){
                    // Bot is now asking zip code.
                    response.should.have.property("confirming", "zip_code");
                }
            );
        });
    });

    describe("collect existing parameter by collect_by_param", function(){
        it("will successfully add modify param of skill.required_parameter and add it to_confirm.", function(){
            this.timeout(8000);

            let options = Util.create_options();
            let webhook = new Webhook(options);
            return webhook.run(Util["create_req_to_clear_memory"](user_id)).then(
                function(response){
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "住民票を申請したい"));
                }
            ).then(
                function(response){
                    // Bot is now asking juminhyo type
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "本人だけ"));
                }
            ).then(
                function(response){
                    // Bot is now asking name.
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "中嶋一樹です"));
                }
            ).then(
                function(response){
                    // Bot is now confirming if name is correct.
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "はい"));
                }
            ).then(
                function(response){
                    // Bot is now asking zip code.
                    response.previous.message[0].message.text.should.equal("次にご住所ですが、郵便番号を教えていただけますか？");
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "107-0061"));
                }
            ).then(
                function(response){
                    // Bot is now asking if city is correct.
                    return webhook.run(Util.create_req(message_platform, "message", user_id, "いいえ"));
                }
            ).then(
                function(response){
                    // Bot is now asking zip code once again.
                    response.previous.message[0].message.text.should.equal("なんと。お手数ですが郵便番号を再度教えてもらえますか？");
                }
            );
        });
    });
});
