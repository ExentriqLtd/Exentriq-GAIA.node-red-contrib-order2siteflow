var MaxRectsBinPack = require("./maxRectsBinPack.js");

module.exports = function(RED) {

    function Order2SiteFlow(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        try {
            this.on('input', function(msg) {
        	
        	//REPLACE WITH YOUR BUSINESS LOGIC
                msg.payload = examplePacker();
                //
                
                node.send(msg);
            });
        } catch (e) {
            node.error("ops, there was an error!", msg);
        }
    }
    
    // initiialize the layout
	var packer = null;
	var pageWidth = 31; //inches, = 800mm
	var pageHeight = 39;
	var pageMargin = 2;
	var pageTotalMargin = pageMargin*2;
	var pageWidthNoMargins = pageWidth - pageTotalMargin;
	var pageHeightNoMargins = pageHeight - pageTotalMargin; 
	var unit = "in";
	
	var showPreview = false;
	
	function scaleToFit(input){
		scale = 10;
		return input/scale;
	}
	
	function runPacker(){
		packer = new MaxRectsBinPack(pageWidthNoMargins, pageHeightNoMargins);
		console.log("new page " + pageWidthNoMargins + " x " + pageHeightNoMargins);
		if(showPreview){
			var cont = $("<div class='page'></div>");
			cont.css("width", scaleToFit(pageWidth) + unit)
			cont.css("height", scaleToFit(pageHeight) + unit)
			$("#preview").append(cont)
		}
		var pages = [];
		pages[0] = {
			elements : []
		}
		var pageIndex = 0;
		
		var jsonInput = JSON.parse($("#od").val());
		
		var items = jsonInput.items;
		
		for (var itemName in items) {
	      if (items.hasOwnProperty(itemName)) { 
		      
		      var item = items[itemName];
		      var size = item.size;
		      var h = parseFloat(size.split("x")[0].replace("\"",""));
			  var w = parseFloat(size.split("x")[1].replace("\"",""));
		        
		        
		      for(var i=0; i < item.quantity; i++){
		        
		        node = packer.Insert(h, w, 2);
				if(node.height == 0){
					//page
					pageIndex++;
					pages[pageIndex] = {
						elements : []
					}
					packer = new MaxRectsBinPack(pageWidthNoMargins, pageHeightNoMargins);
					console.log("new page " + pageWidthNoMargins + " x " + pageHeightNoMargins);
					if(showPreview){
						cont = $("<div class='page'></div>");
						cont.css("width", scaleToFit(pageWidth) + unit)
						cont.css("height", scaleToFit(pageHeight) + unit)
						
						//cont.css("top", scaleToFit(pageHeight * (pageIndex+1)) + unit)
						
						$("#preview").append(cont)
					}
					node = packer.Insert(h, w, 2);
					if(showPreview){
						var nodeHtml = $("<div class='node'></div>");
						nodeHtml.css("width", scaleToFit(node.width) + unit);
						nodeHtml.css("height", scaleToFit(node.height)+unit);
						nodeHtml.css("left", scaleToFit(node.x+pageMargin) + unit);
						nodeHtml.css("top", scaleToFit(node.y + pageMargin) + unit);
						cont.append(nodeHtml);
					}
				}else{
					pages[pageIndex].elements.push(node);
					if(showPreview){
						var nodeHtml = $("<div class='node'></div>");
						nodeHtml.css("width", scaleToFit(node.width) + unit);
						nodeHtml.css("height", scaleToFit(node.height)+unit);
						nodeHtml.css("left", scaleToFit(node.x+pageMargin) + unit);
						nodeHtml.css("top", scaleToFit(node.y + pageMargin) + unit);
						cont.append(nodeHtml);
					}
				}
			}
	      }
	    }

		console.log(pages);
		if(showPreview){
			var json = JSON.stringify(pages);
			$("#json").html(json)
		}
		return json;
	};
	
	function examplePacker(){

		packer = new MaxRectsBinPack(200,200);
		//var node = packer.Insert(10, 20,2);
		
		var pages = [];
		pages[0] = {
			elements : []
		}
		var pageIndex = 0;
		for(var i=0; i < 10; i++){
			node = packer.Insert(30, 20,2);
			if(node.height == 0){
				//page
				pageIndex++;
				pages[pageIndex] = {
					elements : []
				}
				packer = new MaxRectsBinPack(200,200);
				node = packer.Insert(30, 20,2);
			}else{
				pages[pageIndex].elements.push(node);
			}
		}
		
		console.log(pages);
		var json = JSON.stringify(pages);
		return json;
	};
	
    RED.nodes.registerType("order-to-siteflow", Order2SiteFlow);
}