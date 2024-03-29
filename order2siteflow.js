 const OneflowClient = require('oneflow-sdk-js');
 
 module.exports = function(RED) {

    function Order2SiteFlow(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        try {
            this.on('input', function(msg) {
        	
        		//layout preparation
        		if(msg.payload.attachment == null){
	        		
	        		var items = msg.payload.items;
	        		var itemsArtMap = {};
	        		
	        		var hasPuzzle = false;
	        		for(var i=0; i < items.length; i++){
		        		var obj = {
			        		final_art : msg.payload.ftpGetFile + items[i].path + "/" + items[i].finalAssetReady,
			        		cut_file : msg.payload.ftpGetFile + items[i].cutfile + "/" + items[i].cutFileReady
		        		}
		        		if(items[i]["custom_box"]){
			        		obj["custom_box"] = items[i]["custom_box"];
			        		hasPuzzle = true;
		        		}
		        		
		        		itemsArtMap[items[i].key] = obj;
	        		}
	        		
	        		console.log("prepare layouts");
	        		
	                var tmpLayouts = null;
	                
	                if(!hasPuzzle)
		                tmpLayouts = runPacker(msg.payload.clientDetails, itemsArtMap, node, msg.payload.useGroup);
	                else{
		                msg.payload.itemsMap = itemsArtMap;
	                }
	                
	                if(hasPuzzle){
		                
	                }else if(msg.payload.singlepagelayout != null){
		               //9 april 2019: dpi decided to have only one pages layout and to get the number of copies to print
		               
		               var itemsMap = {};
		               
		               
		                for(var l = 0; l < tmpLayouts.length; l++){
			                var layoutObj = JSON.parse(tmpLayouts[l])
			                var pages = layoutObj.pages;
			                var elements = pages[0].elements;
			                
			                var onePageLayout = [];
			                onePageLayout.push(pages[0]);
			                var itemName = layoutObj.itemName; //at position 0 there is always the mark
			                
			                //for each item, i need the number of copies for page and the number of pages (sheets)
			                
			                var pagesToPrint = {pages: pages.length, elements: elements};
			                
			                itemsMap[itemName] = pagesToPrint;
			                
			                layoutObj.pages = onePageLayout;
			                delete layoutObj.name;
			                tmpLayouts[l] = JSON.stringify(layoutObj);
		                }
		                msg.payload.layouts = tmpLayouts;
		                msg.payload.itemsMap = itemsMap;
	                }else{
		                 msg.payload.layouts = tmpLayouts;
	                }
	                
	                node.send(msg);
	                
	            }
	            //oneflow order creation
	            else{
		             var client;
		             
		             if(msg.validate){
			             client = new OneflowClient(
				    	"https://pro-api.oneflowcloud.com/api",
				    	msg.payload.token,
				    	msg.payload.secret
				    );
		             }else{
			             client = new OneflowClient(
				    	"https://orders.oneflow.io/api",// + msg.route,
				    	msg.payload.token,
				    	msg.payload.secret
				    );
		             }
		             
				    
				    const destinationName  = msg.payload.destinationName;
				    const orderData  = { 
					    sourceOrderId: (msg.payload.prefix ? msg.payload.prefix : "") + msg.payload.code
					    };
				    const order = client.createOrder(destinationName, orderData);
				    
				    if(msg.payload.sourceID){
						order.destination.source = msg.payload.sourceID;
					}
				    
				    var itemsMap = msg.payload.itemsMap; //where are stored the number of pages to print for each item
				    
				    
					//order.addStockItem({ code: '123', quantity: 10 });
				
					var shipData = msg.payload.order["shipping_data"];
					
					var shipType = msg.payload.order["shipping_type"];
					
					var code = "customer";
					var service = "shipping";
					var alias = null;
					
					if(shipType){
						if(shipType.code == "ups_ground_dpi"){
							code = null;//"ups";
							service = null;//"groundof";
							alias = shipType.code;
						}
						
						if(shipType.code == "ups_2nddayair_dpi"){
							code = null;//"ups";
							service = null;//"2nddayairof";
							alias = shipType.code;
						}
						
						if(shipType.code == "ups_3dayselect_dpi"){
							code = null;//"ups";
							service = null;//"3dayselectof";
							alias = shipType.code;
						}
						
						if(shipType.code == "ups_nextdayairsaver_dpi"){
							code = null;//"ups";
							service = null;//"nextdayairsaverof";
							alias = shipType.code;
						}
					}
					var carrier = {};
					if(shipType && shipType.code)
						carrier.alias = shipType.code;
					if(service)
						carrier.service = service;
					if(code)
						carrier.code = code;
					
					order.addShipment({
						shipTo: {
							name: shipData.firstName + " " + shipData.lastName,
							address1: shipData.street1,
							town: shipData.city,
							isoCountry: shipData.country.toUpperCase(),
							postcode: shipData.zipCode,
							state: shipData.state.toUpperCase(),
							phone: shipData.phone,
							companyName: shipData.companyName || ""
						},
						carrier: carrier
					});
					
					var items;
					if(typeof(msg.payload.order) == "string"){
						var jsonInput = JSON.parse(msg.payload.order);
						items = jsonInput.items;
					}else{
						items = msg.payload.order.items;
					}
					
					order.orderData.amount = 1;
					
					for (var itemName in items) {
				      if (items.hasOwnProperty(itemName)) { 
					    var itemObj = items[itemName];
						const sourceItemId = itemName; //missing
						const sku = itemObj.sku;//"llama-stickers"; //put in catalog
						
						if(!sku || sku == ""){
							//sticky signs not in the siteflow order
							continue;
						}
						
						const quantity = itemObj.quantity;
						var path = msg.payload.attachment + itemName;// 'https://s3-eu-west-1.amazonaws.com/oneflow-public/business_cards.pdf';
						
						
						var fetch = true;
						
						if(sku.match("manual") || sku.match("puzzle")){
							
							/* if user never uploaded a file, the artwork is taken from FTP final folder */
							if(!itemObj.upload){
								path = msg.payload.ftpGetFile + itemObj.path + "/" + itemObj.finalAssetReady;
							}else{
								path = msg.payload.serverName + itemObj.upload;
							}
							
							fetch = false;
						}
						
						const item = order.addItem({ sku, quantity, sourceItemId });
						
						//must be an array of objects
						var attributes = 
							{
								
							}
						
						
						
						
						
						if(fetch){
							
							if(itemObj.customAttributes){
								attributes = itemObj.customAttributes;
							}
							
							if(itemObj.materialSelect){
								attributes["Material"] = itemObj.materialSelect;
							}
							
							item.printQuantity = 1;//Jim, 25 july, use always 1 -  itemsMap[itemName].pages;
							attributes["ItemSheetQuantity"] =  itemsMap[itemName].pages;
							
							var overPercent = itemsMap[itemName].pages * 8 /100;
							if(overPercent < 4){
								overPercent = 4;
							}
							attributes["Overs"] = overPercent;
							
							var tot = 0;
							for(var c =0; c < itemsMap[itemName].elements.length; c++){
								if(itemsMap[itemName].elements[c]["class"] != "Mark"){
									tot++;
								}
							}
							attributes["QuantityPerSheet"] =  tot;
							
							if(itemObj.material){
								attributes["Lamination"] = itemObj.material
							}
							item.addComponent({ code: 'Artwork', path, fetch, "attributes": attributes });
						}else{
							fetch = true;
							item.addComponent({ code: 'Artwork', path, fetch, "localFile": false });
						}
						
						
						var cutFilePath = path + "_cutfile";
						
						if(sku.match("manual") == null && sku.match("puzzle") == null){
							item.addComponent({ code: 'Cut_File', path: cutFilePath , fetch });
						}
						
						if(itemObj["custom_box"] != null){
							item.addComponent({ code: 'Custom_Box', path: itemObj["custom_box"] , fetch });
						}
						
						if(sku.match("puzzle")){
							
							item.addComponent({ code: 'Puzzle', path:  (msg.payload.ftpGetFile + itemObj.path + "/" + itemObj.finalAssetReady) , fetch });
						}
						
						
						}
					}
					
					
					
					msg.payload = order;
					
					node.warn("msg.validate " + msg.validate)
					
					if(msg.validate != null){
						//validateOrder(client, node, msg);
						//node.send(msg);
						submitOrder(client, node, msg);
					}else{
						submitOrder(client, node, msg);
					}
					
					
	            }
                //
                
                
            });
        } catch (e) {
	        node.error("ops, there was an error!", msg);
        }
    }
    
    async function validateOrder(validator, ref, msg){
	    try {
		    
		    if(ref){
			    ref.warn("validateOrder")
		    }
		   
		var savedOrder = await validator.validateOrder();
			if(ref){
				ref.warn("Success");
				ref.warn("Order ID        :", savedOrder._id);
				
			}
		} catch (err) {
			if(ref){
				ref.warn(err);
				ref.warn("Error " + err.code);
				ref.warn(err.message);
				if (err.validations) {
					err.validations.forEach(validation => {
						ref.warn(validation.path, " -> ", validation.message);
					});
				}
			}
	
		}
		msg.oneflowResponse = savedOrder;
		ref.send(msg);
    }
    
    async function submitOrder(client, ref, msg){
	    
	    msg.submitResult = "none";
	    ref.warn("Try to submit order");
	    if(msg.route){
		    ref.warn("Route: " + msg.route);
	    }
	    
	    try {
		var savedOrder = await client.submitOrder({routingRule : msg.route}, ref);
		if(ref){
			msg.submitResult = "success";
				ref.warn("Success");
				ref.warn("Sieflow Order ID:", savedOrder._id);
				
			}
		} catch (err) {
			
			msg.submitResult = "error";
			
			if(ref){
				ref.warn(err);
				ref.warn("Error " + err.code);
				ref.warn(err.message);
				if (err.validations) {
					err.validations.forEach(validation => {
						ref.warn(validation.path, " -> ", validation.message);
					});
				}
			}
		}
		msg.oneflowResponse = savedOrder;
		ref.send(msg);
    }
    
    var packer = null;
	var pageWidth = 29.5; //inches, = 800mm
	var pageHeight = 20.75;
	var pageMargin = 0.5;
	var cutLinesSpace = 0.25
	var pageTotalMargin = pageMargin*2;
	
	var bleed = 0.250;// 0.125;
	
	var dotWidth = 0.1875;
	var dotsSpace = dotWidth*2;// + cutLinesSpace; //we need to reserve a space in the printable area that is just for dots
			
	var pageWidthNoMargins = pageWidth - pageTotalMargin - dotsSpace;
	var pageHeightNoMargins = pageHeight - pageTotalMargin - dotsSpace; 
			
	var unit = "in";
	var packMethod = 0;
	
	
	var showPreview = false;
	
	function scaleToFit(input){
		scale = 10;
		return input/scale;
	}
	
	function runPacker(clientDetails,itemsArtMap, ref, useGroup){
		console.log("run packer");
			var allLayouts = [];
			
			var items;
			if(typeof(clientDetails) == "string"){
				var jsonInput = JSON.parse(clientDetails);
				items = jsonInput.items;
			}else{
				items = clientDetails.items;
			}
						
			var count = 1;		
			for (var itemName in items) {
		      if (items.hasOwnProperty(itemName)) { 
			       var item = items[itemName];
			       //var layout = runPackerCallback(item, itemName,itemsArtMap, ref)
			       //change to couple of layout, final and cut_file
			       var layouts = runPackerCallback(item, itemName,itemsArtMap, ref, count, useGroup)
			       
			       allLayouts.push(layouts.finalArt);
			       allLayouts.push(layouts.cutFile);
			       
			       count++;
			  }
			}
			return allLayouts;
	}
	
	function runPackerCallback(item, itemName, itemsArtMap, ref, count, useGroup){	
		
			var useGroupTmp = useGroup || true;
		
			var res = {
					"defaults": {
				      "units": unit,//"mm",
				      "useGroup": useGroupTmp,//"default true", param used to avoid layer separation (21/02/2022)
				      "page": {
				        "size": {
				          "height": pageHeight,
				          "width": pageWidth
				        },
				        "margin": {	
							"left": pageMargin,
							"bottom": pageMargin,
							"right": pageMargin,
							"top": pageMargin
						}
				      }
				    },
				    "assets": {
					    "MarkPic": {
					        "url": "http://labelllama.com/subsites/apps/dpisticker/assets/images/circle.pdf"
					     }
					    },
					"classes": [
						{
					        "height": 0.1875,
							"width": 0.1875,
					        "fit": "fill",
					        "type": "asset",
					        "name": "Mark",
					        "asset": "MarkPic"
					      }
					]
				}
				
		var packer = new MaxRectsBinPack(pageWidthNoMargins, pageHeightNoMargins);
		var dotWidth = 0.1875;
				
		var rand = Math.random() * pageWidth/3;
				
				
				var dotTopLeft = {
				            "class": "Mark",
				            "x": pageMargin + 0.01 + rand,
				            "y": pageMargin + 0.01
				          };
				
				var dotTopRight =        {
				            "class": "Mark",
				            "x": pageWidth - pageMargin*2 - dotWidth - rand,
				            "y": pageMargin
				          }
				
				var dotMiddleLeft = {
				            "class": "Mark",
				            "x": pageMargin,
				            "y": (pageHeight - pageMargin*2 - dotWidth - rand)/2
				          }
				          
				var dotMiddleRight = {
				            "class": "Mark",
				            "x": pageWidth - pageMargin*2 - dotWidth,
				            "y": (pageHeight - pageMargin*2 - dotWidth - rand)/2
				          }
				
				var dotTopMiddle ={
				            "class": "Mark",
				            "x": (pageWidth - pageMargin*2 - dotWidth - rand)/2,
				            "y": pageMargin
				          }
				          
				var dotBottomMiddle ={
				            "class": "Mark",
				            "x": (pageWidth - pageMargin*2 - dotWidth - rand)/2,
				            "y": pageHeight - pageMargin - dotWidth
				          }
				
				var dotBottomLeft ={
				            "class": "Mark",
				            "x": pageMargin,
				            "y": pageHeight - pageMargin - dotWidth - rand
				          }
				
				var dotBottomRight ={
				            "class": "Mark",
				            "x": pageWidth - pageMargin*2 - dotWidth - rand,
				            "y": pageHeight - pageMargin - dotWidth
				          } 
				
				
				var pattern1 = count == 1;
				var pattern2 = count == 2;
				var pattern3 = count == 3;
				var pattern4 = count == 4;
				
				var pages = [];
				pages[0] = {
					elements : [
						  
				      ]
				}
				
				if(pattern1){
					pages[0].elements.push(dotTopLeft);
					pages[0].elements.push(dotTopRight);
					pages[0].elements.push(dotBottomMiddle);
					pages[0].elements.push(dotBottomRight);
					pages[0].elements.push(dotMiddleLeft);
				}else if(pattern2){
					pages[0].elements.push(dotTopMiddle);
					pages[0].elements.push(dotTopRight);
					pages[0].elements.push(dotBottomMiddle);
					pages[0].elements.push(dotBottomLeft);
					pages[0].elements.push(dotMiddleLeft);
				}else if(pattern3){
					pages[0].elements.push(dotTopMiddle);
					pages[0].elements.push(dotTopLeft);
					pages[0].elements.push(dotBottomMiddle);
					pages[0].elements.push(dotBottomRight);
					pages[0].elements.push(dotMiddleRight);
				}else if(pattern4){
					pages[0].elements.push(dotTopRight);
					pages[0].elements.push(dotTopMiddle);
					pages[0].elements.push(dotBottomMiddle);
					pages[0].elements.push(dotMiddleRight);
					pages[0].elements.push(dotMiddleLeft);
				}else{
					if(Math.random() > 0.6)
						pages[0].elements.push(dotTopMiddle);
					if(Math.random() > 0.6)
						pages[0].elements.push(dotTopRight);
					if(Math.random() > 0.6)
						pages[0].elements.push(dotTopLeft);
					if(Math.random() > 0.6)
						pages[0].elements.push(dotBottomMiddle);
					if(Math.random() > 0.6)
						pages[0].elements.push(dotMiddleRight);
					if(Math.random() > 0.6)
						pages[0].elements.push(dotMiddleLeft);
					if(Math.random() > 0.6)
						pages[0].elements.push(dotBottomLeft);
					if(Math.random() > 0.6)
						pages[0].elements.push(dotBottomRight);
				}
		
		var pageIndex = 0;
		
		
		
		try{
		
		      //var item = items[itemName];
		      var size = item.size;
		      console.log("size " + size);
		      console.log("item.type " + item.type);
			  var w = null;
			  var h = null;	
			  //note that dpi uses this notation for sizes: hxw
						  
						  
		      var fileName = itemsArtMap[itemName]["final_art"];
			 
			  //add die cut condition
			  try{
				  if(item.type == "Die Cut Stickers" || item.type == "Stickers Sheets" || item.type == "Kiss Cut Stickers"){
					  console.log("DIE CUT, get size from name " + fileName);
					  var fileParts = fileName.split("_");
					  if(fileParts && fileParts.length > 1){
						  var tmpSize = fileParts[1]; 
						  h = parseFloat(tmpSize.split("x")[1].replace("\"",""));
						  w = parseFloat(tmpSize.split("x")[0].replace("\"",""));
					  }
				  }
			  }catch(e){
				  console.log("DIE CUT, cannot get size from name " + fileName);
			  }
			  
		      console.log("size from filename " + size);
		      if(w == null)
			      w = parseFloat(size.split("x")[0].replace("\"",""));
			  if(h == null)
				  h = parseFloat(size.split("x")[1].replace("\"",""));
			  
			  console.log("w " + w);
			  console.log("h " + h);
			  
			  w += bleed
			  h += bleed
			  
			  h+=cutLinesSpace;
			  w+=cutLinesSpace;
		      
		      res.assets[itemName] = {
			      "url": fileName //item.final
		      }
		      res.classes.push({
		        "height": h,
		        "width": w,
		        "fit": "cover",
		        "type": "asset",
		        "name": itemName,
		        "asset": itemName
		      })
		      
		      var approxNumberOfItemsInPage = parseInt((pageWidthNoMargins/w)*(pageHeightNoMargins/h)/2);
		      var avoidWaste = true;
		      
		      var firstPageIsFull = false; //this is a new option for labelllama: if stickers not fill the page, add more to fill all the page
		      for(var i=0; i < item.quantity || !firstPageIsFull; i++){
		        
		        node = packer.Insert(h, w, packMethod);
				if(node.height == 0){
					firstPageIsFull = true;
					
					if(i > item.quantity){
							continue;
					}
					
					//page
					pageIndex++;
					pages[pageIndex] = {
								elements : [
								      {
							            "class": "Mark",
							            "x": 0.2,
							            "y": 0.2
							          },
							          {
							            "class": "Mark",
							            "x": pageWidth - 0.2 - dotWidth,
							            "y": pageHeight - 0.2 - dotWidth
							          },
							          {
							            "class": "Mark",
							            "x": 0.2,
							            "y": pageHeight - 0.2 - dotWidth
							          },
							          {
							            "class": "Mark",
							            "x": pageWidth - 0.2 - dotWidth,
							            "y": 0.2
							          }
							      ]
							}
							
							
					packer = new MaxRectsBinPack(pageWidthNoMargins, pageHeightNoMargins);
					node = packer.Insert(h, w, packMethod);
					node["class"] = itemName;
					delete node.elementInstance;
					delete node.scaled;
					
					node.height = node.height - cutLinesSpace;
					node.width = node.width - cutLinesSpace;
					node.x = node.x + pageMargin + dotsSpace; //siteflow consider 0 the starting point, even when we add page margins
					node.y = node.y + pageMargin + dotsSpace;
					
					pages[pageIndex].elements.push(node);
					
				}else{
					node["class"] = itemName;
					delete node.elementInstance;
					delete node.scaled;
					
					node.height = node.height - cutLinesSpace;
					node.width = node.width - cutLinesSpace;
					node.x = node.x + pageMargin + dotsSpace; //siteflow consider 0 the starting point, even when we add page margins
					node.y = node.y + pageMargin + dotsSpace;
					
					pages[pageIndex].elements.push(node);
					
					if(avoidWaste && i > item.quantity & i > approxNumberOfItemsInPage){
						firstPageIsFull = true;
					}
					
				}
			}
	    
	    }catch(e){
		    ref.warn(e);
	    }
		res.pages = pages;
		
		res.itemName = itemName;
		var json = JSON.stringify(res);
		var couple = {
			"finalArt" : json
		}
		
		//generate also cut_file_template
		var cut = JSON.parse(json); //a simple way to clone obj
		
		cut.assets[itemName] = {
			      "url": itemsArtMap[itemName]["cut_file"] //item.final
		      }
		      
		cut.itemName = itemName+ "_cutfile";  
		var cutJson = JSON.stringify(cut);
		couple["cutFile"] = cutJson;
		    
		return couple;
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
		$("#json").html(json)
		return json;
	};
	
	var RectBestShortSideFit = 0; ///< -BSSF: Positions the Rectangle against the short side of a free Rectangle into which it fits the best.
	var RectBestLongSideFit = 1; ///< -BLSF: Positions the Rectangle against the long side of a free Rectangle into which it fits the best.
	var RectBestAreaFit = 2; ///< -BAF: Positions the Rectangle into the smallest free Rectangle into which it fits.
	var RectBottomLeftRule = 3; ///< -BL: Does the Tetris placement.
	var RectContactPointRule = 4; ///< -CP: Choosest the placement where the Rectangle touches other Rectangles as much as possible
	
	 
	//----------Utility classes used by this code
	Rect=function()
	{
		this.ctor();
	};
	Rect.prototype = 
	{
		ctor:function()
		{
			this.Reset();
		},
		// copy operation
		Copy:function(src)
		{
			this.x =src.x;
			this.y =src.y;
			this.width =src.width;
			this.height =src.height;
			this.scaled = false;
		},
		//compare all dimensions and position of the rect
		EqualRect:function(src)
		{
			return(this.x == src.x && this.y == src.y && this.width == src.width && this.height == this.height);
		},
		Reset:function()
		{
			this.x=this.y=this.width=this.height=0;	
			this.elementInstance = null; //link back to the element instance that uses this rect.
			this.scaled = false;
		},
		//scales the rect up or down
		Scale:function(enclosingRect)
		{
			var scaleFactor = enclosingRect.height / this.height;
			this.height = this.height * scaleFactor;
			scaleFactor = enclosingRect.width / this.width;
			this.width = this.width * scaleFactor;
			this.scaled = true;
		}
		
	};
	 
	/* Utility class to allow passing values by reference */
	RefNumber=function(initialVal)
	{
		this.ctor(initialVal);
	};
	
	RefNumber.prototype = 
	{
			ctor:function(initialVal)
		    {
				this.val = initialVal;
		    },
		   set:function(val)
		   {
			   this.val = val;
		   },
		   get:function()
		   {
			   return this.val;
		   },
		   gt:function(val)
		   {
			   return this.val > val;
		   },
		   lt:function(val)
		   {
			   return this.val < val;
		   },
		   gtt:function(val)
		   {
			   return this.val >= val;
		   },
		   ltt:function(val)
		   {
			   return this.val <= val;
		   }
	};
	//============================================
	 
	 MaxRectsBinPack=function(width, height) 
	{
		  this.ctor(width, height);
	};
	
	MaxRectsBinPack.prototype = 
	{      
		ctor:function(width,height)
	    {
			this.binWidth = 0;
			this.binHeight = 0;
			this.allowRotations = true;//rotations;
			this.usedRectangles = new Array();
			this.freeRectangles = new Array();
			
			this.Init(width,height,true);
	    },
	    
		Init:function(width, height, rotations)
		{
			this.binWidth = width;
			this.binHeight = height;
			this.allowRotations = rotations; // unused
			
			var n = new Rect();
			n.x = 0;
			n.y = 0;
			n.width = width;
			n.height = height;
			
			this.usedRectangles.length = 0;
			
			this.freeRectangles.length = 0;
			this.freeRectangles.push( n );
		},
	
	Insert:function( width,  height,  method)
	{
		var newNode = new Rect();
		var score1 = new RefNumber(0); // Unused in this function. We don't need to know the score after finding the position.
		var score2 = new RefNumber(0);
		
		switch(method)
		{
			case RectBestShortSideFit: 
				newNode = this.FindPositionForNewNodeBestShortSideFit(width, height, score1, score2); 
				break;
			case RectBottomLeftRule: 
				newNode = this.FindPositionForNewNodeBottomLeft(width, height, score1, score2); 
				break;
			case RectContactPointRule: 
				newNode = this.FindPositionForNewNodeContactPoint(width, height, score1); 
				break;
			case RectBestLongSideFit: 
				newNode = this.FindPositionForNewNodeBestLongSideFit(width, height, score2, score1); 
				break;
			case RectBestAreaFit: 
				newNode = this.FindPositionForNewNodeBestAreaFit(width, height, score1, score2); 
				break;
		}
			
		if (newNode.height == 0)
		{
			return newNode;
		}
			
		var numRectanglesToProcess = this.freeRectangles.length;
		for(var i = 0; i < numRectanglesToProcess; i++) 
		{
			if (this.SplitFreeNode(this.freeRectangles[i], newNode)) 
			{
				this.freeRectangles.splice(i,1);
				--i;
				--numRectanglesToProcess;
			}
		}
		
		this.PruneFreeList();		
		this.usedRectangles.push(newNode);
		
		/*
		var numRectanglesToProcess = this.freeRectangles.length;
		for(var i = 0; i < numRectanglesToProcess; ++i)
		{
			if (this.SplitFreeNode(this.freeRectangles[i], newNode))
			{
				freeRectangles.erase(freeRectangles.begin() + i);
				--i;
				--numRectanglesToProcess;
			}
		}
	
		PruneFreeList();
	
		usedRectangles.push_back(newNode);*/
		
		//console.log("MaxRects updateposition " + method, newNode)
		
		return newNode;
	},
	
	BatchInsert:function(rects, dst, method)
	{
		dst.length = 0;
	
		while(rects.length > 0)
		{
			var bestScore1 = 999999;
			var bestScore2 = 999999;
			var bestRectIndex = -1;
			var bestNode = new Rect();
	
			for(var i = 0; i < rects.length; ++i)
			{
				var score1= new RefNumber();
				var score2= new RefNumber();
				var newNode = this.ScoreRect(rects[i].width, rects[i].height, method, score1, score2);
	
				if (score1.val < bestScore1 || (score1.val == bestScore1 && score2.val < bestScore2))
				{
					bestScore1 = score1.val;
					bestScore2 = score2.val;
					bestNode = newNode;
					bestRectIndex = i;
				}
			}
	
			if (bestRectIndex == -1)
			{
				return;
			}
				
			this.PlaceRect(bestNode);
			rects.splice(bestRectIndex,1);		
		}
	},
	
	PlaceRect:function(node)
	{
		var numRectanglesToProcess = this.freeRectangles.length;
		for(var i = 0; i < numRectanglesToProcess; ++i)
		{
			if (this.SplitFreeNode(this.freeRectangles[i], node))
			{
				this.freeRectangles.splice(i,1);
				--i;
				--numRectanglesToProcess;
			}
		}
	
		this.PruneFreeList();
	
		this.usedRectangles.push(node);
		//		dst.push_back(bestNode); ///\todo Refactor so that this compiles.
	},
	
	ScoreRect:function( width,  height,  method, score1, score2) 
	{
		var newNode =new Rect();
		score1.val = Number.MAX_VALUE;
		score2.val = Number.MAX_VALUE;
		
		switch(method)
		{
			case RectBestShortSideFit: 
				newNode = this.FindPositionForNewNodeBestShortSideFit(width, height, score1, score2);
				break;
			case RectBottomLeftRule: 
				newNode = this.FindPositionForNewNodeBottomLeft(width, height, score1, score2); 
				break;
			case RectContactPointRule: 
				newNode = this.FindPositionForNewNodeContactPoint(width, height, score1); 
				score1.val = -score1.val; // Reverse since we are minimizing, but for contact point score bigger is better.
				break;
			case RectBestLongSideFit: 
				newNode = this.FindPositionForNewNodeBestLongSideFit(width, height, score2, score1); 
				break;
			case RectBestAreaFit: 
				newNode = this.FindPositionForNewNodeBestAreaFit(width, height, score1, score2); 
				break;
		}
	
		// Cannot fit the current rectangle.
		if (newNode==null || newNode.height == 0)
		{
			score1.val = Number.MAX_VALUE;
			score2.val = Number.MAX_VALUE;
		}
	
		return newNode;
	},
	
	/// Computes the ratio of used surface area.
	Occupancy:function() 
	{
		var usedSurfaceArea = 0;
		for(var i = 0; i < this.usedRectangles.length; ++i)
		{
			usedSurfaceArea += this.usedRectangles[i].width * this.usedRectangles[i].height;
		}
			
		return usedSurfaceArea / (this.binWidth * this.binHeight);
	},
	
	FindPositionForNewNodeBottomLeft:function( width,  height,  bestY,  bestX) 
	{
		var bestNode = new Rect();
	
		bestY.val = Number.MAX_VALUE;
	
		for(var i = 0; i < this.freeRectangles.length; ++i)
		{
			// Try to place the rectangle in upright (non-flipped) orientation.
			if (this.freeRectangles[i].width >= width && this.freeRectangles[i].height >= height)
			{
				var topSideY = this.freeRectangles[i].y + height;
				if (topSideY < bestY.val || (topSideY == bestY.val && this.freeRectangles[i].x < bestX.val))
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = width;
					bestNode.height = height;
					bestNode.rotation = 0;
					bestY.val = topSideY;
					bestX.val = this.freeRectangles[i].x;
				}
			}
			if (this.freeRectangles[i].width >= height && this.freeRectangles[i].height >= width)
			{
				var topSideY = this.freeRectangles[i].y + width;
				if (topSideY < bestY.val || (topSideY == bestY.val && this.freeRectangles[i].x < bestX.val))
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = height;
					bestNode.height = width;
					bestNode.rotation = 90;
					bestY.val = topSideY;
					bestX.val = this.freeRectangles[i].x;
				}
			}
		}
		return bestNode;
	},
	
	FindPositionForNewNodeBestShortSideFit:function( width,  height,  bestShortSideFit,  bestLongSideFit)	
	{
		var bestNode = new Rect();
		
		bestShortSideFit.val = Number.MAX_VALUE;
	
		for(var i = 0; i < this.freeRectangles.length; ++i)
		{
			// Try to place the rectangle in upright (non-flipped) orientation.
			if (this.freeRectangles[i].width >= width && this.freeRectangles[i].height >= height)
			{
				var leftoverHoriz = Math.abs(this.freeRectangles[i].width - width);
				var leftoverVert = Math.abs(this.freeRectangles[i].height - height);
				var shortSideFit = Math. min(leftoverHoriz, leftoverVert);
				var longSideFit =  Math.max(leftoverHoriz, leftoverVert);
	
				if (shortSideFit < bestShortSideFit.val || (shortSideFit == bestShortSideFit.val && longSideFit < bestLongSideFit.val))
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = width;
					bestNode.height = height;
					bestNode.rotation = 0;
					bestShortSideFit.val = shortSideFit;
					bestLongSideFit.val = longSideFit;
				}
			}
	
			if (this.freeRectangles[i].width >= height && this.freeRectangles[i].height >= width)
			{
				var flippedLeftoverHoriz = Math.abs(this.freeRectangles[i].width - height);
				var flippedLeftoverVert =  Math.abs(this.freeRectangles[i].height - width);
				var flippedShortSideFit =  Math.min(flippedLeftoverHoriz, flippedLeftoverVert);
				var flippedLongSideFit =   Math.max(flippedLeftoverHoriz, flippedLeftoverVert);
	
				if (flippedShortSideFit < bestShortSideFit.va || (flippedShortSideFit == bestShortSideFit.val && flippedLongSideFit < bestLongSideFit.val))
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = height;
					bestNode.height = width;
					bestNode.rotation = 90;
					bestShortSideFit.val = flippedShortSideFit;
					bestLongSideFit.val = flippedLongSideFit;
				}
			}
		}
		return bestNode;
	},
	
	FindPositionForNewNodeBestLongSideFit:function( width,  height,bestShortSideFit, bestLongSideFit)  	
	{
		var bestNode = new Rect();
		
		bestLongSideFit.val = Number.MAX_VALUE;
	
		for(var i = 0; i < this.freeRectangles.length; ++i)
		{
			// Try to place the rectangle in upright (non-flipped) orientation.
			if ( this.freeRectangles[i].width >= width &&  this.freeRectangles[i].height >= height)
			{
				var leftoverHoriz = Math.abs(this.freeRectangles[i].width - width);
				var leftoverVert = Math.abs(this.freeRectangles[i].height - height);
				var shortSideFit = Math.min(leftoverHoriz, leftoverVert);
				var longSideFit = Math.max(leftoverHoriz, leftoverVert);
	
				if (longSideFit < bestLongSideFit.val || (longSideFit == bestLongSideFit.val && shortSideFit < bestShortSideFit.val))
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = width;
					bestNode.height = height;
					bestNode.rotation = 0;
					bestShortSideFit.val = shortSideFit;
					bestLongSideFit.val = longSideFit;
				}
			}
	
			if (this.freeRectangles[i].width >= height && this.freeRectangles[i].height >= width)
			{
				var leftoverHoriz = Math.abs(this.freeRectangles[i].width - height);
				var leftoverVert = Math.abs(this.freeRectangles[i].height - width);
				var shortSideFit = Math.min(leftoverHoriz, leftoverVert);
				var longSideFit = Math.max(leftoverHoriz, leftoverVert);
	
				if (longSideFit < bestLongSideFit.val || (longSideFit == bestLongSideFit.val && shortSideFit < bestShortSideFit.val))
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = height;
					bestNode.height = width;
					bestNode.rotation = 90;
					bestShortSideFit.val = shortSideFit;
					bestLongSideFit.val = longSideFit;
				}
			}
		}
		return bestNode;
	},
	
	FindPositionForNewNodeBestAreaFit:function( width,  height, bestAreaFit, bestShortSideFit) 	
	{
		var bestNode = new Rect();
		bestAreaFit.val = Number.MAX_VALUE;
	
		for(var i = 0; i < this.freeRectangles.length; ++i)
		{
			var areaFit =  this.freeRectangles[i].width *  this.freeRectangles[i].height - width * height;
			
			//console.log("areaFit " + areaFit + " " + this.freeRectangles[i].width + " " + width)
	
			// Try to place the rectangle in upright (non-flipped) orientation.
			if ( this.freeRectangles[i].width >= width &&  this.freeRectangles[i].height >= height)
			{
				var leftoverHoriz = Math.abs( this.freeRectangles[i].width - width);
				var leftoverVert = Math.abs( this.freeRectangles[i].height - height);
				var shortSideFit = Math.min(leftoverHoriz, leftoverVert);
	
				//console.log("areaFit2 " + areaFit + " " + bestAreaFit.val + " " + this.freeRectangles[i].x)
	
				if (areaFit < bestAreaFit.val || (areaFit == bestAreaFit.val && shortSideFit < bestShortSideFit.val))
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = width;
					bestNode.height = height;
					bestNode.rotation = 0;
					bestShortSideFit.val = shortSideFit;
					bestAreaFit.val = areaFit;
				}
			}
	
			if (this.freeRectangles[i].width >= height && this.freeRectangles[i].height >= width)
			{
				var leftoverHoriz = Math.abs(this.freeRectangles[i].width - height);
				var leftoverVert = Math.abs(this.freeRectangles[i].height - width);
				var shortSideFit = Math.min(this.leftoverHoriz, leftoverVert);
	
				if (areaFit < bestAreaFit.val || (areaFit == bestAreaFit && shortSideFit < bestShortSideFit.val))
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = height;
					bestNode.height = width;
					bestNode.rotation = 90;
					bestShortSideFit.val = shortSideFit;
					bestAreaFit.val = areaFit;
				}
			}
		}
		return bestNode;
	},
	
	/// Returns 0 if the two intervals i1 and i2 are disjoint, or the length of their overlap otherwise.
	CommonIntervalLength:function( i1start,  i1end,  i2start,  i2end)
	{
		if (i1end < i2start || i2end < i1start)
		{
			return 0;
		}		
		return Math.min(i1end, i2end) - Math.max(i1start, i2start);
	},
	
	ContactPointScoreNode:function( x,  y,  width,  height) 
	{
		var score = 0;
	
		if (x == 0 || x + width == this.binWidth)
			score += height;
		if (y == 0 || y + height == this.binHeight)
			score += width;
	
		for(var i = 0; i < this.usedRectangles.length; ++i)
		{
			if ( this.usedRectangles[i].x == x + width ||  this.usedRectangles[i].x +  this.usedRectangles[i].width == x)
				score +=  this.CommonIntervalLength( this.usedRectangles[i].y,  this.usedRectangles[i].y +  this.usedRectangles[i].height, y, y + height);
			if (this.usedRectangles[i].y == y + height || this.usedRectangles[i].y + this.usedRectangles[i].height == y)
				score +=  this.CommonIntervalLength( this.usedRectangles[i].x,  this.usedRectangles[i].x +  this.usedRectangles[i].width, x, x + width);
		}
		return score;
	},
	
	FindPositionForNewNodeContactPoint:function( width,  height, bestContactScore) 
	{
		var bestNode = new Rect();
		
		bestContactScore.val = -1;
	
		for(var i = 0; i < this.freeRectangles.length; ++i)
		{
			// Try to place the rectangle in upright (non-flipped) orientation.
			if (this.freeRectangles[i].width >= width && this.freeRectangles[i].height >= height)
			{
				var score = this.ContactPointScoreNode(this.freeRectangles[i].x, this.freeRectangles[i].y, width, height);
				if (score > bestContactScore.val)
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = width;
					bestNode.height = height;
					bestNode.rotation = 0;
					bestContactScore.val = score;
				}
			}
			if (this.freeRectangles[i].width >= height && this.freeRectangles[i].height >= width)
			{
				var score = this.ContactPointScoreNode(this.freeRectangles[i].x, this.freeRectangles[i].y, width, height);
				if (score > bestContactScore.val)
				{
					bestNode.x = this.freeRectangles[i].x;
					bestNode.y = this.freeRectangles[i].y;
					bestNode.width = height;
					bestNode.height = width;
					bestNode.rotation = 90;
					bestContactScore.val = score;
				}
			}
		}
		return bestNode;
	},
	
	SplitFreeNode:function( freeNode, usedNode)
	{
		// Test with SAT if the rectangles even intersect.
		if (usedNode.x >= freeNode.x + freeNode.width || usedNode.x + usedNode.width <= freeNode.x ||
			usedNode.y >= freeNode.y + freeNode.height || usedNode.y + usedNode.height <= freeNode.y)
			return false;
	
		if (usedNode.x < freeNode.x + freeNode.width && usedNode.x + usedNode.width > freeNode.x)
		{
			// New node at the top side of the used node.
			if (usedNode.y > freeNode.y && usedNode.y < freeNode.y + freeNode.height)
			{
				//XXX In javascript the assignment is just points to the object instead of copying a stack object like it would in C++
				// Now both newNode and freeNode point to the same object and when newNode makes changes things fall apart,.
				// do explicit copy
				var newNode = new Rect();
				newNode.Copy(freeNode);
				
				newNode.height = usedNode.y - newNode.y;
				this.freeRectangles.push(newNode);
			}
	
			// New node at the bottom side of the used node.
			if (usedNode.y + usedNode.height < freeNode.y + freeNode.height)
			{
				var newNode = new Rect();
				newNode.Copy(freeNode);
				newNode.y = usedNode.y + usedNode.height;
				newNode.height = freeNode.y + freeNode.height - (usedNode.y + usedNode.height);
				this.freeRectangles.push(newNode);
			}
		}
	
		if (usedNode.y < freeNode.y + freeNode.height && usedNode.y + usedNode.height > freeNode.y)
		{
			// New node at the left side of the used node.
			if (usedNode.x > freeNode.x && usedNode.x < freeNode.x + freeNode.width)
			{
				var newNode = new Rect();
				newNode.Copy(freeNode);
				newNode.width = usedNode.x - newNode.x;
				this.freeRectangles.push(newNode);
			}
	
			// New node at the right side of the used node.
			if (usedNode.x + usedNode.width < freeNode.x + freeNode.width)
			{
				var newNode = new Rect();
				newNode.Copy(freeNode);
				newNode.x = usedNode.x + usedNode.width;
				newNode.width = freeNode.x + freeNode.width - (usedNode.x + usedNode.width);
				this.freeRectangles.push(newNode);
			}
		}
	
		return true;
	},
	
	PruneFreeList:function()
	{
		/* 
		///  Would be nice to do something like this, to avoid a Theta(n^2) loop through each pair.
		///  But unfortunately it doesn't quite cut it, since we also want to detect containment. 
		///  Perhaps there's another way to do this faster than Theta(n^2).
	
		if (freeRectangles.length > 0)
			clb::sort::QuickSort(&freeRectangles[0], freeRectangles.length, NodeSortCmp);
	
		for(size_t i = 0; i < freeRectangles.length-1; ++i)
			if (freeRectangles[i].x == freeRectangles[i+1].x &&
			    freeRectangles[i].y == freeRectangles[i+1].y &&
			    freeRectangles[i].width == freeRectangles[i+1].width &&
			    freeRectangles[i].height == freeRectangles[i+1].height)
			{
				freeRectangles.erase(freeRectangles.begin() + i);
				--i;
			}
		*/
	
		/// Go through each pair and remove any rectangle that is redundant.
		for(var i = 0; i < this.freeRectangles.length; ++i)
			for(var j = i+1; j <  this.freeRectangles.length; ++j)
			{
				if (this.IsContainedIn( this.freeRectangles[i],  this.freeRectangles[j]))
				{
					 this.freeRectangles.splice(i,1);
					--i;
					break;
				}
				if ( this.IsContainedIn( this.freeRectangles[j],  this.freeRectangles[i]))
				{
					 this.freeRectangles.splice(j,1);
					--j;
				}
			}
	},
	// return true if rect a is within rect b
	IsContainedIn:function(a,b)
	{
		return( a.x >= b.x && a.y >= b.y  && a.x+a.width <= b.x+b.width && a.y+a.height <= b.y+b.height);
	}
	
	
	}; // class end
	
    RED.nodes.registerType("order-to-siteflow", Order2SiteFlow);
}