module.exports = function(RED) {

    function Order2SiteFlow(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        try {
            this.on('input', function(msg) {
        	
        	//REPLACE WITH YOUR BUSINESS LOGIC
                msg.payload = msg.payload.toUpperCase();
                //
                
                node.send(msg);
            });
        } catch (e) {
            node.error("ops, there was an error!", msg);
        }
    }
    
    RED.nodes.registerType("order-to-siteflow", Order2SiteFlow);
}