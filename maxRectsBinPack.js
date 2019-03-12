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
				bestNode.rotated = true;
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
