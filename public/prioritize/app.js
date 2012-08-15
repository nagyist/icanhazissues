var Handler = function(){
  this.events = {};
}
Handler.prototype.on = function(event, callback){
  this.events[event] = callback
}
Handler.prototype.emit = function(event, data){
  this.events[event](data)
}

var IssueView = function(issue){
  this.template = $('#issue').clone();
  this.template.attr('id', null);
  this.template.find('h4 a').text(issue.title)
  this.template.find('h4 a').attr('href',  issue.html_url)
  this.template.css('-webkit-transform', 'rotate('+(-5 + Math.random() * 10) +'deg)')
  this.template.attr('id', issue.id)
  this.template.data('number', issue.number);
  
  for (var i=0; i < issue.labels.length; i++) {
    if (issue.labels[i].name == 'bug'){
      this.template.addClass('bug')
    }
    if (issue.labels[i].name == 'blocked'){
      this.template.addClass('blocked')
    }
  };
  
  this.template.draggable({
    containment: 'document',
    scroll: false,
    zIndex: 10000,
    revert: 'invalid',
    helper: 'clone',
    start: function(evt, ui){
      $(this).css('opacity', 0)
    },
    stop: function(evt, ui){
      $(this).css('opacity', 1)
    }
  });  
  this.template.handler = new Handler()
}

var ColumnView = function(el, phase){
  el.data('phase', phase)
  el.droppable({
    accept: function(el){
      var id = $(el).attr('id');
      if ($(this).data('phase') == '' && hasNoLabel(issueHash[id]) )
        return false
      return !hasLabel(issueHash[id], $(this).data('phase'))
    },
    drop: function( event, ui ) {
      var phase = $(this).data('phase')
      var id = $(ui.draggable).attr('id')
      var number = $(ui.draggable).data('number')
      $(this).removeClass('over')
      setPhase(number, phase, function(){
        // callback?
      })
  		issues = _.reject(issues, function(issue){ return issue.id == id; });
  		$(ui.draggable).css({ left: 0, top: 0})
  		$(this).find('.drop').append( $(ui.draggable) )
  	},
  	over: function(event, ui) { 
      $(this).addClass('over')
  	},
  	out: function(event, ui) { 
      $(this).removeClass('over')
  	}
  })
}

var draggable;
$().ready(function(){
  redraw();
  new ColumnView($('.all'), '')
  new ColumnView($('.ready'), 'ready')
  new ColumnView($('.priority'), 'priority')
  $('#labelFilter').change(function(){
    redraw( $(this).val() )
  })
})

var setPhase = function(id, phase, callback){
  $.ajax({
    url: '/set_phase/'+id,
    type: 'POST',
    data: {label: phase},
    error: function(data){
      alert('error')
    },
    success: callback
  })
}

function hasLabel(issue, label){
  return (_.detect(issue.labels, function(a) { return a.name == label }) != null )
}

function hasNoLabel(issue){
  return (issue.labels.length < 1 || doesntHaveLabel(issue, ['ready', 'priority']))
}

function doesntHaveLabel(issue, excludeLabels){
  var labels =  _.map(issue.labels, function(l){ return l.name }) ;
  return (_.intersection(excludeLabels, labels).length < 1 )
}

var EXCLUDED_LABELS = [
  'done',
  'review',
  'release',
  'development'
]

var issueHash = {};
function redraw(filter){
  $('.drop').empty();
  var newIssues = _.filter(issues, function(issue){ 
    var labels =  _.map(issue.labels, function(l){ return l.name }) ;
    return (_.intersection(EXCLUDED_LABELS, labels).length < 1 )
  });  
  if (filter && filter != 'all' ){
    newIssues = _.filter(newIssues, function(issue){
      return hasLabel(issue, filter)
    })
  }
  newIssues.forEach(function(issueData){
    issueHash[issueData.id] = issueData;
    var issue = new IssueView( issueData )
    if (hasLabel(issueData, 'priority')){
      $('.priority .drop').append( issue.template );
    } else if (hasLabel(issueData, 'ready')){
      $('.ready .drop').append( issue.template );
    } else {
      $('.all .drop').append( issue.template );
    }
  })

}