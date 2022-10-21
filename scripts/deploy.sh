#!/bin/zsh

function usage() {
  echo "usage: $FILENAME [network] [contract] (noverify)
       $FILENAME [network] upgrade [upgrade contract] (noverify)
    [network] : (localhost/goerli/ropsten/main)
    [contract] : (all/admin/nft/1st/2nd/money)
    [upgrade contract] : (nft/1st/2nd/money)
    (noverify : option)"
}

### 스크립트 수정 규칙 ###
# 배포할 컨트랙트가 추가되면 
## 1. CONTRACTS_KEY와 CONTRACTS_MAP에 추가해야 한다
## 1. JS_DEPLOY_XXXX 를 추가해야 한다
## 1. JS_DEPLOY_XXXX 에 해당하는 deploy_xxxx.js 를 scripts 폴더 하위에 생성해야 한다
## 1. upgrade를 지원한다면 upgrade_xxxx.js 를 추가해야 한다
## 1. upgrade를 지원하지 않는다면 makePattern 함수에 unset을 추가해야 한다

NODE_PID=0
FILENAME=${0}
NETWORK=${1}
CONTRACT=${2}
UPGRADE=${3}
( [[ "$@[-1]" = "noverify" ]] || [[ $NETWORK = 'localhost' || $NETWORK == '' ]]) && SKIP_VERIFY=1
( [[ "$@[-1]" = "notest" ]] || [[ $NETWORK = 'localhost' ]] ) && SKIP_TEST=1

##JS_DEPLOY_ADMIN='scripts/deploy_admin.js'
##JS_DEPLOY_NFT='scripts/deploy_nft.js'
##JS_DEPLOY_1ST='scripts/deploy_1stMarket.js'
##JS_DEPLOY_2ND='scripts/deploy_2ndMarket.js'
##JS_DEPLOY_MONEY='scripts/deploy_royaltygroup.js'

RELATIVE_DIR=`dirname "$0"`
JS_DEPLOY_ADMIN="$RELATIVE_DIR/deploy_admin.js"
JS_DEPLOY_NFT="$RELATIVE_DIR/deploy_nft.js"
JS_DEPLOY_1ST="$RELATIVE_DIR/deploy_1stMarket.js"
JS_DEPLOY_2ND="$RELATIVE_DIR/deploy_2ndMarket.js"
JS_DEPLOY_MONEY="$RELATIVE_DIR/deploy_royaltygroup.js"

typeset -A CONTRACTS_MAP
typeset -a CONTRACTS_KEY
i=1
CONTRACTS_KEY=( admin 1st 2nd nft money )
CONTRACTS_MAP=( $CONTRACTS_KEY[i++] MSAProxyImple
                $CONTRACTS_KEY[i++] MS1stProxy
                $CONTRACTS_KEY[i++] MS2ndProxyImple
                $CONTRACTS_KEY[i++] MSProxyImple 
                $CONTRACTS_KEY[i++] MSMoneyProxyImple)

function checkJQ() {
  which jq > /dev/null
  if [ $? -ne 0 ]; then
    echo "Not found 'jq' command"
    exit 1
  fi
}

function checkFile() {
  if [ ! -f $1 ]; then
    echo "$1 file not found."
    checkReturn 1
  fi
}

function checkReturn() {
  if [ $1 -ne 0 ]; then
    exit $1
  fi
}

function deploy() {
  ARG=JS_DEPLOY_${1:u}
  checkFile "${(P)ARG}"
  npx hardhat run --network $NETWORK "${(P)ARG}"
  checkReturn $?
  echo "deploy $1 done."
}

function verify() {
  npx hardhat verify --network $NETWORK $@
  checkReturn $?
}

function verify_new() {
  PROXY=$(cat $RELATIVE_DIR/config.json | jq -r .$NETWORK.$CONTRACTS_MAP[$1])
  echo $PROXY
  verify ${PROXY}
  echo "verify $1 done."
}

function upgrade() {
  ARG=JS_DEPLOY_${1:u}
  ARG="${(P)ARG/deploy_/upgrade_}" 
  checkFile $ARG
  npx hardhat run --network $NETWORK $ARG
  checkReturn $?
}

function run_node() {
  if [[ -z $(ps -ef | grep 'hardhat node' | grep -v grep) ]]; then
    npx hardhat node >> hardhat_node.log &
    NODE_PID=$!
  fi
}

function run_deploy_verify() {
  deploy $1

  if [[ $SKIP_VERIFY -ne 1 ]]; then
    verify_new $1
  fi
}

function run_all() {
  npx hardhat clean
  for key in ${CONTRACTS_KEY}; do
    run_deploy_verify $key
  done
}

function run_test() {
  if [[ $SKIP_TEST -ne 1 ]]; then
    npx hardhat test
    checkReturn $?
  fi  
}

function makePattern() {
  typeset -A CONTRACTS
  CONTRACTS=( ${(kv)CONTRACTS_MAP} )
  local IFS=$'|'
  PATTERN="${(k)CONTRACTS}"
  unset 'CONTRACTS[admin]'
  unset 'CONTRACTS[money]'
  UPG_PATT="${(k)CONTRACTS}"
  unset IFS
  unset CONTRACTS
}


if [[ $NETWORK == 'main' ]]; then
  echo "Not implementation mainnet deploy."
  exit 0
fi

if [[ $CONTRACT == '' ]]; then
  usage
  exit 1
elif [[ $NETWORK == '' || $NETWORK == 'localhost' ]]; then
  NETWORK='localhost'
  run_node
elif [[ $SKIP_VERIFY -ne 1 ]]; then
  checkJQ
fi

run_test
makePattern

case "$CONTRACT" in
  # nft | 1st | 2nd | admin | money)
  $~PATTERN)
    run_deploy_verify $CONTRACT
    ;;
  upgrade)
    case "$UPGRADE" in
      $~UPG_PATT)
        upgrade $UPGRADE
        ;;
      *)
        usage
        exit 1
    esac
    ;;
  verify)
    case "$UPGRADE" in
      $~UPG_PATT)
        verify_new $UPGRADE
        ;;
      *)
        usage
        exit 1
    esac
    ;;
  all)
    run_all
    ;;
  *)
    usage
    exit 1
esac


function egress() {
  if [ $NODE_PID -ne 0 ]; then
    kill $NODE_PID
  fi
}

# Set trap on EXIT for node
trap egress EXIT
