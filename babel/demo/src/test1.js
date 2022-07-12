import React from 'react';
import classnames from 'classnames';

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
    let ret = (
      <div>
        <div className={`demo-class ${this.namespace}`} ></div>
        <div className={[
          'class-a',
          'class-b',
          {
            'class-c': true,
            'class-d': this.props.show
          }
        ]}></div>
        <div className={classnames({ a: true })}></div>
      </div>
    );
    if (a) ret = <span className={['a', 'b']}></span>
    else ret = <p></p>;
    console.log('ddd', ret);
    return ret;

    // return this.cc();
    // return a && <div>dd</div>
  }

}

export default App;
