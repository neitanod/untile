jQuery.fn.untile = function(config){

  var elms = jQuery(this);
  return elms.map(
      function(index, element){
        var elm = jQuery(element);

        var tile = elm.data('untile');
        if(tile == undefined) {
          tile = new Untile(elm, config);
          elm.data('untile',tile); // guardo el estado del tile
        }
        return tile;
      })[0];
}




Untile = function(elm, options){

  // Default options:
  var default_options = {
    debug: false,
    rows: 2,
    redrawOnResize: true,
    onchange: false  // callback: function(jQ_element_highlighted, index_element_highlighted, this)
  }

  this.options = jQuery.extend(default_options , options);
  // End of default options

  var $ = jQuery;
  var elm = this.elm = $(elm);

  this.initialize = function(){
    this._do_once = {};
    this.viewport = elm;
    this.elements = elm.find(".tile");
    this.viewport.css({position: "relative"});
    this.elements.css({position: "absolute"});
    this.active = 0;
    this.load();
    this.draw();

    var that = this;
    this.viewport.find('.untile-next').css({"z-index":100}).click(function(){ that.next(); });
    this.viewport.find('.untile-prev').css({"z-index":100}).click(function(){ that.prev(); });

    if(this.options.redrawOnResize){
      $(window).resize(function() { that.doOnce("resized", function(){ that.draw(); }); });
    }
    return this;
  }

  this.load = function(){
    var that = this;
    jQuery.each(this.elements, function(i){
      var elm = jQuery(this);
      var y = i;
      elm.click(function(){ that.browseTo(y); })
      elm.css({left: (i*30)});
    });
    return this;
  }

  this.draw = function(options){
    // Default options:
    var default_options = {
      animate: true
    }
    var options = jQuery.extend(default_options , options);

    this.log("Active: "+this.active);
    this.log("First: "+this.getFirstIndex());
    this.log("Last: "+this.getLastIndex());
    this.log("Last Column: "+this.getLastColumn());

    var that = this;
    jQuery.each(this.elements,function(i){
      var elm = jQuery(this);
      if(i >= that.getElementCount()) {
        elm.hide();
        return false;
      }
      if(i == that.active){
        var newpos = {top: 0, left: that.getMainLeft(), width: that.getMainWidth(), height: that.getMainHeight()};
        elm.css({'z-index': 20});
        if(options.animate){
          elm.animate(newpos);
        } else {
          elm.css(newpos);
        }
      } else {
        var newpos = {top: that.getTileTop(i), left: that.getTileLeft(i), width: that.getTileWidth(), height: that.getTileHeight()};
        if((i == that.getFirstIndex() || i == that.getLastIndex()) && Math.abs(newpos['left']-elm.position().left) > that.getMainWidth()){
          elm.hide(); // prevent the items from crossing the screen
        }
        elm.css({'z-index': 10})
        if(options.animate){
          elm.animate(newpos,function(){elm.show();});
        } else {
          elm.css(newpos).show();
        }
      }
    });

    if(this.options.onchange){
      this.options.onchange($(this.elements[this.active]),this.active,this);
    }
    return this;
  }

  this.next = function(){
    return this.activate((this.getElementCount()+this.active+1)%this.getElementCount());
  }

  this.prev = function(){
    return this.activate((this.getElementCount()+this.active-1)%this.getElementCount());
  }

  this.activate = function(index, options){
    this.active = Math.max(Math.min(index, this.getElementCount()), 0);
    this.draw(options);
    return this;
  }

  this.doOnce = function(id, myFunction){
    clearTimeout(this._do_once[id]);
    this._do_once[id] = setTimeout(myFunction, 100);
    return this;
  }

  this.browseTo = function(index){
    var idx = index;
    var that = this;
    this.doOnce('browseTo', function(){ that.activate(idx); });
    return this;
  }

  this.jumpTo = function(index){
    this.log(index);
    this.activate(index,{animate: false});
    return this;
  }

  this.getElementCount = function(){
    // returns only those elements that can be shown
    return Math.floor(this.elements.length/this.options.rows)*this.options.rows;
  }

  this.getFirstIndex = function(){
    // returns the index of the first tile it has to draw
    return (this.getLastIndex() + 1) % this.getElementCount();
  }

  this.getLastIndex = function(){
    return (this.options.rows * this.getLastColumn() + this.active) % this.getElementCount();
  }

  this.getMainLeft = function() {
    return ( this.viewport.width() - this.getMainWidth() ) /2;
  }

  this.getTileLeft = function(index) {
    // returns the css left property in pixels
    // calculated based on current active
    var left = 0;
    if(this.goesToTheLeft(index)) {
      left = this.getMainLeft();
    } else {
      left = this.getMainRight();
    }
    return left + this.getTileColumn(index) * this.getTileWidth();
  }

  this.getTileTop = function(index) {
    return this.getTileRow(index)*this.getTileHeight();
  }

  this.getMainRight = function() {
    // returns the css left property in pixels
    // for the first column to the right of the
    // highlighted item
    return this.getMainLeft() + this.getMainWidth();
  }

  this.getColumns = function() {
    // returns the number of colums for the tiling
    return Math.ceil((this.getElementCount() - 1) / this.options.rows);
  }

  this.getColumnsToTheRight = function() {
    // returns the number of columns to the right
    // of the highlighted item
    return Math.floor(this.getColumns() / 2);
  }

  this.getColumnsToTheLeft = function() {
    // returns the number of columns to the left
    // of the highlighted item
    return Math.ceil(this.getColumns() / 2);
  }

  this.goesToTheLeft = function(index) {
    if(index == this.active) return false;
    if(this.getFirstIndex() < this.active){
      if(index >= this.getFirstIndex() && index < this.active){
        return true;
      } else {
        return false;
      }
    } else {
      if(index >= this.getFirstIndex() || index < this.active){
        return true;
      } else {
        return false;
      }
    }
  }

  this.getLastColumn = function(){
    return this.getColumnsToTheRight();
    return Math.ceil(this.getElementCount() / this.options.rows / 2);
  }

  this.getRelativizedIndex = function(index){
    // normalize value (make it relative to active item)

    var maxNormal = this.getColumnsToTheRight() * this.options.rows;
    var minNormal = maxNormal - this.getElementCount() + 1;
    var normal = index - this.active;
    if(normal > maxNormal) normal = normal - this.getElementCount();
    if(normal < minNormal) normal = normal + this.getElementCount();
    return normal;
  }

  this.getTileRow = function(index){
    if(this.goesToTheLeft(index)){
      return index % this.options.rows; //Math.abs(this.options.rows-(index+1)) % this.options.rows;
    } else {
      return (this.options.rows-1+index) % this.options.rows;
    }
  }

  this.getTileColumn = function(index){
    // returns column number for given item
    var normal = this.getRelativizedIndex(index); // normalize value (make it relative to active item)


    if(normal == 0) {
      //this.log("Index: "+index+", normalized: "+normal+", Active, row: "+this.getTileRow(index)+", left: "+this.goesToTheLeft(index));
      return 0;
    }

    // to the right, the elements must cover
    // for the abcense of the highlighted one in the grid
    if(!this.goesToTheLeft(index)) normal = normal - 1 ; //- (this.options.rows-1);

    var col = Math.floor(normal / this.options.rows);

    //this.log("Index: "+index+", normalized: "+normal+", column: "+col+", row: "+this.getTileRow(index)+", left: "+this.goesToTheLeft(index));

    return col;
  };

  this.getMainHeight = function(){
    // returns the height for the highlighted item
    return this.viewport.height();
  }

  this.getMainWidth = function(){
    // returns the width for the highlighted item
    return this.getMainHeight()*this.elements.width()/this.elements.height();
  }

  this.getTileHeight = function(){
    // returns the height for the tiled items
    return this.viewport.height() / this.options.rows;
  }

  this.getTileWidth = function(){
    // returns the width for the tiled items
    if(this._tileWidth == undefined) {
      this._tileWidth = Math.floor(this.getMainHeight() * this.elements.width() / this.elements.height() / this.options.rows);
    }
    return this._tileWidth;
  }

  this.rows = function(rows){
    this.options.rows = rows;
    this.eraseCachedValues();
    this.draw();
    return this;
  }

  this.eraseCachedValues = function() {
    this._tileWidth = undefined;
    return this;
  }

  this.set = function(options) {
    this.options = jQuery.extend(this.options, options);
    this.eraseCachedValues();
    return this;
  }

  this.log = function(msg){
    if(this.options.debug) console.log(msg);
    return this;
  }

  this.initialize();
}
