import React from 'react';

import './test.scss';
import './index.scss?scoped';

class App extends Rainbow.Component {

  constructor(props) {
    super(props);

  }

  static data() {
    return {
    };
  }

  static methods = {
    dd() {
      return <div className="test"></div>
    }
  }

  cc() {
    return <div className="test"></div>;
  }

  render() {
    let a = true;
    let ret = <div></div>;
    if (a) ret = <span className={['a', 'b']}></span>
    else ret = <p></p>;
    console.log('ddd', ret);
    return ret;

    // return this.cc();
    // return a && <div>dd</div>
  }

}

export default App;
