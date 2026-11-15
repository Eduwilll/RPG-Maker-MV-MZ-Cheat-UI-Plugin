import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

async function factory() {
  try {
    return (
      await import("../../cheat-engine/www/cheat/js/runtime/BattleActions.js")
    ).createBattleActions;
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND")
      assert.fail("Battle actions are not implemented");
    throw error;
  }
}
function engine(mz = false) {
  return vm.runInNewContext(`(function(){
    function Scene_Map(){} function Scene_Battle(){}
    function Game_Enemy(id,x,y){this.id=id;this.x=x;this.y=y;this._hp=10;}
    Game_Enemy.prototype.onBattleStart=function(){this.started=true;};
    function Sprite_Enemy(enemy){this.enemy=enemy;this.y=enemy.y;}
    var troop={_enemies:[],_troopId:0, troop:function(){return game.$dataTroops[this._troopId];},
      members:function(){return this._enemies;},makeUniqueNames:function(){this.named=true;},
      setup:function(id){this._troopId=id;this._enemies=[];var data=this.troop();
        for(var i=0;i<data.members.length;i++){var m=data.members[i];this._enemies.push(new Game_Enemy(m.enemyId,m.x,m.y));}}};
    var sprites={_enemySprites:[],_battleField:{children:[],addChild:function(s){this.children.push(s);},
      addChildAt:function(s,i){this.children.splice(i,0,s);},removeChild:function(s){var i=this.children.indexOf(s);if(i>=0)this.children.splice(i,1);}},
      compareEnemySprite:function(a,b){return a.y-b.y;}};
    var game={JSON:JSON,Array:Array,Scene_Map:Scene_Map,Scene_Battle:Scene_Battle,Game_Enemy:Game_Enemy,Sprite_Enemy:Sprite_Enemy,
      $dataEnemies:[null,{id:1,name:'Slime'}],$dataTroops:[null,{id:1,name:'Normal',members:[{enemyId:1,x:100,y:200}],pages:[],plugin:{keep:true}}],
      $gameTroop:troop,$gameParty:{inBattle:function(){return game.battle;}},
      $gameMap:{isEventRunning:function(){return game.event;}},$gamePlayer:{isTransferring:function(){return game.transfer;}},
      $gameMessage:{isBusy:function(){return game.message;}},Graphics:{boxWidth:816,boxHeight:624},
      BattleManager:{_phase:'',setup:function(id){troop.setup(id);this._phase='init';},isBattleEnd:function(){return this._phase==='battleEnd';}},
      SceneManager:{_scene:new Scene_Map(),isSceneChanging:function(){return false;},push:function(C){this.next=C;}},
      sprites:sprites,battle:false,event:false,transfer:false,message:false};
    game.enterBattle=function(){game.battle=true;game.SceneManager._scene=new Scene_Battle();game.SceneManager._scene._spriteset=sprites;game.BattleManager._phase='input';};
    return game;
  })()`);
}
test("start guards reject busy maps, battle, transition and unavailable engine methods", async () => {
  const create = await factory();
  const g = engine();
  const a = create(g);
  for (const key of ["event", "transfer", "message", "battle"]) {
    g[key] = true;
    assert.equal(a.availability().start.allowed, false);
    assert.throws(() => a.startTroop(1));
    g[key] = false;
  }
  g.SceneManager.isSceneChanging = () => true;
  assert.throws(() => a.startEnemies([1]));
  g.SceneManager.isSceneChanging = () => false;
  delete g.BattleManager.setup;
  assert.equal(a.availability().start.allowed, false);
  assert.throws(() => a.startTroop(1));
});
test("temporary repeated-enemy encounters restore database and use game-realm roster", async () => {
  const create = await factory();
  const g = engine();
  const before = g.$dataTroops.slice();
  const a = create(g);
  a.startEnemies([1, 1]);
  assert.equal(g.$gameTroop.members().length, 2);
  assert.equal(g.$dataTroops.length, 2);
  assert.equal(g.$dataTroops[1], before[1]);
  assert.ok(g.$gameTroop.troop().members instanceof g.Array);
  assert.equal(g.$gameTroop.troop().members[1].enemyId, 1);
  assert.equal(g.SceneManager.next, g.Scene_Battle);
  g.$gameTroop.setup(1);
  assert.equal(g.$gameTroop.troop(), g.$dataTroops[1]);
});
test("temporary troop is removed even when plugin setup throws; bad IDs leave engine untouched", async () => {
  const create = await factory();
  const g = engine();
  const a = create(g);
  for (const ids of [[], [0], [1.5], ["1"], [999]])
    assert.throws(() => a.startEnemies(ids));
  for (const id of [0, 1.5, "1", 999]) assert.throws(() => a.startTroop(id));
  g.BattleManager.setup = () => {
    throw Error("plugin setup failed");
  };
  assert.throws(() => a.startEnemies([1]), /plugin setup/);
  assert.equal(g.$dataTroops.length, 2);
});
test("summon registers battler, unique name and sprite without rebuilding existing sprites in MV and MZ", async () => {
  const create = await factory();
  for (const mz of [false, true]) {
    const g = engine(mz);
    const a = create(g);
    a.startTroop(1);
    g.enterBattle();
    const old = new g.Sprite_Enemy(g.$gameTroop.members()[0]);
    g.sprites._enemySprites.push(old);
    g.sprites._battleField.addChild(old);
    const result = a.summon(1);
    assert.equal(g.$gameTroop.members().length, 2);
    assert.equal(g.$gameTroop.members()[1].started, true);
    assert.equal(g.$gameTroop.named, true);
    assert.equal(g.sprites._enemySprites.length, 2);
    assert.ok(g.sprites._enemySprites.includes(old));
    assert.equal(g.sprites._battleField.children.length, 2);
    assert.ok(result);
  }
});
test("summon refuses action/end/aborting phases and unsupported sprites before changing troop", async () => {
  const create = await factory();
  const g = engine();
  const a = create(g);
  a.startTroop(1);
  g.enterBattle();
  for (const phase of [
    "action",
    "battleEnd",
    "aborting",
    "init",
    "start",
    "",
  ]) {
    g.BattleManager._phase = phase;
    assert.equal(a.availability().summon.allowed, false);
    assert.throws(() => a.summon(1));
  }
  g.BattleManager._phase = "input";
  delete g.Sprite_Enemy;
  assert.throws(() => a.summon(1));
  assert.equal(g.$gameTroop.members().length, 1);
});
