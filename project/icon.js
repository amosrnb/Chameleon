(function(){
  function Icon(p){
    var s=+(p.size||16);
    var node=(window.lucide&&window.lucide.icons&&window.lucide.icons[p.icon])||[];
    var kids=(node[0]==='svg'?node[2]:node)||[];
    return React.createElement('svg',{width:s,height:s,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:p.stroke||1.75,strokeLinecap:'round',strokeLinejoin:'round',style:Object.assign({flex:'none',display:'block'},p.style)},
      kids.map(function(k,i){return React.createElement(k[0],Object.assign({key:i},k[1]));}));
  }
  (function def(){ if(window.lucide&&window.React) window.ChIcon=Icon; else setTimeout(def,30); })();
})();
